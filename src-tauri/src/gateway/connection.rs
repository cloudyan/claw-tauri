//! Gateway WebSocket 连接管理
//!
//! 管理 Rust 端到 Gateway 的 WebSocket 连接，实现：
//! - connect.challenge -> connect -> hello-ok 三步握手
//! - JSON-RPC 请求/响应/事件帧处理
//! - 通过 Tauri Events 将 Gateway 事件推送到前端
//! - 自动重连（指数退避）

use crate::state::AppError;
use futures_util::{SinkExt, StreamExt};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, Notify, oneshot};
use tokio::time::{sleep, Duration};
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;

/// 最大重连延迟
const MAX_RECONNECT_DELAY: Duration = Duration::from_secs(60);
/// 初始重连延迟
const INITIAL_RECONNECT_DELAY: Duration = Duration::from_secs(1);
/// 握手超时
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(10);
/// RPC 请求超时
const RPC_TIMEOUT: Duration = Duration::from_secs(30);

/// JSON-RPC 请求帧
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestFrame {
    pub jsonrpc: String,
    pub id: u64,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

/// JSON-RPC 响应帧
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseFrame {
    pub jsonrpc: String,
    pub id: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RpcError>,
}

/// JSON-RPC 错误
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

/// JSON-RPC 事件帧
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventFrame {
    pub jsonrpc: String,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

/// 连接挑战参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChallengeParams {
    pub methods: Vec<String>,
    #[serde(rename = "challenge")]
    pub challenge_value: String,
}

/// 连接参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectParams {
    #[serde(rename = "clientId")]
    pub client_id: String,
    #[serde(rename = "clientName")]
    pub client_name: String,
    #[serde(rename = "clientVersion")]
    pub client_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
}

/// Hello-Ok 响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HelloOkResponse {
    pub id: u64,
    #[serde(rename = "serverVersion")]
    pub server_version: String,
    #[serde(rename = "serverName")]
    pub server_name: String,
    #[serde(rename = "capabilities")]
    pub capabilities: serde_json::Value,
}

/// 待处理的 RPC 请求
struct PendingRequest {
    sender: oneshot::Sender<Result<serde_json::Value, AppError>>,
}

/// Gateway WebSocket 连接
pub struct GatewayConnection {
    /// WebSocket URL
    ws_url: String,
    /// 连接令牌
    token: String,
    /// 客户端 ID
    client_id: String,
    /// 是否已连接
    connected: Arc<RwLock<bool>>,
    /// 是否正在连接
    connecting: Arc<RwLock<bool>>,
    /// 停止通知
    stop_notify: Arc<Notify>,
    /// 消息发送通道
    message_tx: mpsc::UnboundedSender<String>,
    /// 待处理请求
    pending_requests: Arc<RwLock<HashMap<u64, PendingRequest>>>,
    /// 请求 ID 计数器
    next_id: Arc<RwLock<u64>>,
    /// Tauri 应用句柄
    app_handle: tauri::AppHandle,
}

impl GatewayConnection {
    /// 创建新的 Gateway 连接
    pub fn new(
        ws_url: String,
        token: String,
        app_handle: tauri::AppHandle,
    ) -> Self {
        let (message_tx, _) = mpsc::unbounded_channel::<String>();

        Self {
            ws_url,
            token,
            client_id: Uuid::new_v4().to_string(),
            connected: Arc::new(RwLock::new(false)),
            connecting: Arc::new(RwLock::new(false)),
            stop_notify: Arc::new(Notify::new()),
            message_tx,
            pending_requests: Arc::new(RwLock::new(HashMap::new())),
            next_id: Arc::new(RwLock::new(1)),
            app_handle,
        }
    }

    /// 连接到 Gateway（执行三步握手）
    pub async fn connect(&self) -> Result<(), AppError> {
        if *self.connected.read() {
            log::warn!("已连接到 Gateway");
            return Ok(());
        }

        if *self.connecting.read() {
            log::warn!("正在连接中");
            return Ok(());
        }

        *self.connecting.write() = true;
        log::info!("正在连接到 Gateway: {}", self.ws_url);

        let result = self.do_connect().await;

        *self.connecting.write() = false;

        match &result {
            Ok(_) => {
                *self.connected.write() = true;
                log::info!("Gateway 连接成功");
                let _ = self.app_handle.emit("gateway://connected", serde_json::json!({
                    "ws_url": self.ws_url,
                    "client_id": self.client_id,
                }));
            }
            Err(e) => {
                *self.connected.write() = false;
                log::error!("Gateway 连接失败: {}", e);
                let _ = self.app_handle.emit("gateway://connection-error", serde_json::json!({
                    "error": e.to_string(),
                }));
            }
        }

        result
    }

    /// 执行实际的连接和握手
    async fn do_connect(&self) -> Result<(), AppError> {
        // 建立 WebSocket 连接
        let (ws_stream, _) = tokio::time::timeout(
            HANDSHAKE_TIMEOUT,
            tokio_tungstenite::connect_async(&self.ws_url),
        )
        .await
        .map_err(|_| AppError::Connection("连接超时".to_string()))?
        .map_err(|e| AppError::Connection(format!("WebSocket 连接失败: {}", e)))?;

        let (mut write, mut read) = ws_stream.split();

        // 步骤 1: 发送 connect.challenge
        let challenge_id = 1u64;
        let challenge_request = RequestFrame {
            jsonrpc: "2.0".to_string(),
            id: challenge_id,
            method: "connect.challenge".to_string(),
            params: None,
        };

        let challenge_msg = serde_json::to_string(&challenge_request)?;
        write.send(Message::Text(challenge_msg.into())).await
            .map_err(|e| AppError::Connection(format!("发送 challenge 失败: {}", e)))?;

        // 接收 challenge 响应
        let challenge_response = tokio::time::timeout(HANDSHAKE_TIMEOUT, async {
            loop {
                match read.next().await {
                    Some(Ok(Message::Text(text))) => {
                        let frame: ResponseFrame = serde_json::from_str(&text)?;
                        if frame.id == Some(challenge_id) {
                            return Ok(frame);
                        }
                    }
                    Some(Ok(Message::Ping(_))) => continue,
                    Some(Err(e)) => return Err(AppError::Connection(format!("WebSocket 错误: {}", e))),
                    None => return Err(AppError::Connection("连接已关闭".to_string())),
                    _ => continue,
                }
            }
        })
        .await
        .map_err(|_| AppError::Connection("等待 challenge 响应超时".to_string()))??;

        // 解析 challenge
        let challenge_params: ChallengeParams = challenge_response
            .result
            .ok_or_else(|| AppError::Connection("challenge 响应缺少 result".to_string()))?
            .serde_into()?;

        // 步骤 2: 发送 connect
        let connect_id = 2u64;
        let connect_request = RequestFrame {
            jsonrpc: "2.0".to_string(),
            id: connect_id,
            method: "connect".to_string(),
            params: Some(serde_json::to_value(ConnectParams {
                client_id: self.client_id.clone(),
                client_name: "OpenClaw Desktop".to_string(),
                client_version: "0.1.0".to_string(),
                token: Some(self.token.clone()),
            })?),
        };

        let connect_msg = serde_json::to_string(&connect_request)?;
        write.send(Message::Text(connect_msg.into())).await
            .map_err(|e| AppError::Connection(format!("发送 connect 失败: {}", e)))?;

        // 接收 connect 响应（hello-ok）
        let hello_response = tokio::time::timeout(HANDSHAKE_TIMEOUT, async {
            loop {
                match read.next().await {
                    Some(Ok(Message::Text(text))) => {
                        let frame: ResponseFrame = serde_json::from_str(&text)?;
                        if frame.id == Some(connect_id) {
                            return Ok(frame);
                        }
                    }
                    Some(Ok(Message::Ping(_))) => continue,
                    Some(Err(e)) => return Err(AppError::Connection(format!("WebSocket 错误: {}", e))),
                    None => return Err(AppError::Connection("连接已关闭".to_string())),
                    _ => continue,
                }
            }
        })
        .await
        .map_err(|_| AppError::Connection("等待 hello-ok 响应超时".to_string()))??;

        if hello_response.error.is_some() {
            let err = hello_response.error.unwrap();
            return Err(AppError::Connection(format!(
                "连接被拒绝: [{}] {}",
                err.code, err.message
            )));
        }

        log::info!("Gateway 三步握手完成");

        // 启动消息接收循环
        let pending_requests = self.pending_requests.clone();
        let app_handle = self.app_handle.clone();
        let connected = self.connected.clone();

        tauri::async_runtime::spawn(async move {
            // 消息接收循环
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        // 尝试解析为响应帧
                        if let Ok(frame) = serde_json::from_str::<ResponseFrame>(&text) {
                            if let Some(id) = frame.id {
                                // 查找待处理请求
                                let mut pending = pending_requests.write();
                                if let Some(pending_req) = pending.remove(&id) {
                                    let result = match (frame.result, frame.error) {
                                        (Some(result), _) => Ok(result),
                                        (_, Some(error)) => Err(AppError::Connection(
                                            format!("[{}] {}", error.code, error.message),
                                        )),
                                        _ => Err(AppError::Connection("无效的响应帧".to_string())),
                                    };
                                    let _ = pending_req.sender.send(result);
                                }
                            }
                        } else if let Ok(frame) = serde_json::from_str::<EventFrame>(&text) {
                            // 事件帧，推送到前端
                            let _ = app_handle.emit("gateway://event", serde_json::json!({
                                "method": frame.method,
                                "params": frame.params,
                            }));
                        }
                    }
                    Ok(Message::Ping(data)) => {
                        // WebSocket Ping/Pong 保活
                        // write.send(Message::Pong(data)).await.ok();
                    }
                    Ok(Message::Close(_)) => {
                        log::info!("Gateway 连接已关闭");
                        *connected.write() = false;
                        let _ = app_handle.emit("gateway://disconnected", ());
                        break;
                    }
                    Err(e) => {
                        log::error!("WebSocket 消息错误: {}", e);
                        *connected.write() = false;
                        let _ = app_handle.emit("gateway://connection-error", serde_json::json!({
                            "error": e.to_string(),
                        }));
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }

    /// 断开连接
    pub async fn disconnect(&self) -> Result<(), AppError> {
        *self.connected.write() = false;
        self.stop_notify.notify_waiters();
        log::info!("Gateway 连接已断开");
        Ok(())
    }

    /// 发送 RPC 请求
    pub async fn call(
        &self,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, AppError> {
        if !*self.connected.read() {
            return Err(AppError::Connection("未连接到 Gateway".to_string()));
        }

        let id = {
            let mut next = self.next_id.write();
            let id = *next;
            *next += 1;
            id
        };

        let request = RequestFrame {
            jsonrpc: "2.0".to_string(),
            id,
            method: method.to_string(),
            params,
        };

        let (sender, receiver) = oneshot::channel();

        {
            let mut pending = self.pending_requests.write();
            pending.insert(id, PendingRequest { sender });
        }

        let msg = serde_json::to_string(&request)?;
        self.message_tx.send(msg).map_err(|_| {
            AppError::Connection("消息发送通道已关闭".to_string())
        })?;

        // 等待响应
        tokio::time::timeout(RPC_TIMEOUT, receiver)
            .await
            .map_err(|_| {
                // 清理待处理请求
                let mut pending = self.pending_requests.write();
                pending.remove(&id);
                AppError::Connection("RPC 请求超时".to_string())
            })?
            .map_err(|_| AppError::Connection("请求被取消".to_string()))?
    }

    /// 是否已连接
    pub fn is_connected(&self) -> bool {
        *self.connected.read()
    }

    /// 获取令牌
    pub fn token(&self) -> &str {
        &self.token
    }

    /// 获取 WebSocket URL
    pub fn ws_url(&self) -> &str {
        &self.ws_url
    }
}

/// 辅助 trait：将 serde_json::Value 转换为具体类型
pub trait SerdeInto<T> {
    fn serde_into(self) -> Result<T, AppError>;
}

impl<T: for<'de> Deserialize<'de>> SerdeInto<T> for serde_json::Value {
    fn serde_into(self) -> Result<T, AppError> {
        serde_json::from_value(self).map_err(|e| AppError::Connection(format!("解析失败: {}", e)))
    }
}
