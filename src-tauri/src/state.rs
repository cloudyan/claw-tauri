//! 应用状态管理模块
//!
//! 定义全局共享的应用状态，包括 Gateway 管理器和设置存储。

use crate::gateway::manager::GatewayManager;
use crate::gateway::connection::GatewayConnection;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;
use thiserror::Error;

/// 应用错误类型
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Gateway 错误: {0}")]
    Gateway(String),
    #[error("连接错误: {0}")]
    Connection(String),
    #[error("设置错误: {0}")]
    Settings(String),
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),
    #[error("序列化错误: {0}")]
    Serde(#[from] serde_json::Error),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// 应用设置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    /// Gateway 监听端口
    pub gateway_port: u16,
    /// Gateway WebSocket URL
    pub gateway_url: String,
    /// 自动启动 Gateway
    pub auto_start_gateway: bool,
    /// 主题（dark / light / system）
    pub theme: String,
    /// 语言（zh / en）
    pub language: String,
    /// 通知开关
    pub notifications_enabled: bool,
    /// 最小化到托盘
    pub minimize_to_tray: bool,
    /// 启动时最小化
    pub start_minimized: bool,
    /// 自定义设置
    pub extra: HashMap<String, serde_json::Value>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            gateway_port: 18789,
            gateway_url: "ws://localhost:18789".to_string(),
            auto_start_gateway: true,
            theme: "dark".to_string(),
            language: "zh".to_string(),
            notifications_enabled: true,
            minimize_to_tray: true,
            start_minimized: false,
            extra: HashMap::new(),
        }
    }
}

/// Gateway 运行状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GatewayStatus {
    /// 未运行
    Stopped,
    /// 正在启动
    Starting,
    /// 运行中
    Running,
    /// 正在停止
    Stopping,
    /// 错误状态
    Error(String),
}

/// Gateway 状态信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayInfo {
    /// 运行状态
    pub status: GatewayStatus,
    /// 进程 PID
    pub pid: Option<u32>,
    /// 监听端口
    pub port: u16,
    /// WebSocket URL
    pub ws_url: String,
    /// 连接令牌
    pub token: Option<String>,
    /// Gateway 版本
    pub version: Option<String>,
    /// 启动时间
    pub started_at: Option<i64>,
    /// 连接是否就绪
    pub connected: bool,
}

impl Default for GatewayInfo {
    fn default() -> Self {
        Self {
            status: GatewayStatus::Stopped,
            pid: None,
            port: 18789,
            ws_url: format!("ws://localhost:{}", 18789),
            token: None,
            version: None,
            started_at: None,
            connected: false,
        }
    }
}

/// 全局应用状态
pub struct AppState {
    /// Tauri 应用句柄
    pub app_handle: AppHandle,
    /// Gateway 进程管理器
    pub gateway_manager: Arc<GatewayManager>,
    /// Gateway WebSocket 连接
    pub gateway_connection: Arc<RwLock<Option<GatewayConnection>>>,
    /// 应用设置
    pub settings: Arc<RwLock<AppSettings>>,
}

impl AppState {
    /// 创建新的应用状态
    pub fn new(app_handle: AppHandle) -> Result<Self, AppError> {
        let gateway_manager = Arc::new(GatewayManager::new(app_handle.clone()));

        Ok(Self {
            app_handle,
            gateway_manager,
            gateway_connection: Arc::new(RwLock::new(None)),
            settings: Arc::new(RwLock::new(AppSettings::default())),
        })
    }

    /// 获取 Gateway 信息
    pub fn get_gateway_info(&self) -> GatewayInfo {
        let settings = self.settings.read();
        let mut info = GatewayInfo {
            port: settings.gateway_port,
            ws_url: settings.gateway_url.clone(),
            ..Default::default()
        };

        info.status = self.gateway_manager.status();
        info.pid = self.gateway_manager.pid();

        let conn = self.gateway_connection.read();
        if let Some(ref connection) = *conn {
            info.connected = connection.is_connected();
            info.token = Some(connection.token().to_string());
        }

        info
    }
}
