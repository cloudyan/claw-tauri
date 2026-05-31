//! Gateway 进程管理器
//!
//! 管理 OpenClaw Gateway 作为 sidecar 子进程的生命周期，包括：
//! - 启动/停止/重启 Gateway 进程
//! - 健康检查（HTTP ping）
//! - 自动重启（带熔断器）
//! - 状态跟踪

use crate::state::{GatewayStatus, AppError};
use parking_lot::RwLock;
use std::process::Child;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::AppHandle;
use tokio::sync::Notify;
use tokio::time::sleep;
use uuid::Uuid;

/// 最大连续失败次数（触发熔断）
const MAX_CONSECUTIVE_FAILURES: u32 = 5;
/// 熔断恢复等待时间
const CIRCUIT_BREAKER_COOLDOWN: Duration = Duration::from_secs(60);
/// 健康检查间隔
const HEALTH_CHECK_INTERVAL: Duration = Duration::from_secs(5);
/// 健康检查超时
const HEALTH_CHECK_TIMEOUT: Duration = Duration::from_secs(3);
/// 进程退出后等待时间
const RESTART_DELAY: Duration = Duration::from_secs(2);

/// Gateway 进程管理器
pub struct GatewayManager {
    /// Tauri 应用句柄
    app_handle: AppHandle,
    /// Gateway 子进程
    child: RwLock<Option<Child>>,
    /// 当前状态
    status: RwLock<GatewayStatus>,
    /// 进程 PID
    pid: RwLock<Option<u32>>,
    /// 连接令牌
    token: RwLock<Option<String>>,
    /// Gateway 版本
    version: RwLock<Option<String>>,
    /// 监听端口
    port: RwLock<u16>,
    /// 启动时间
    started_at: RwLock<Option<i64>>,
    /// 连续失败计数（熔断器）
    failure_count: AtomicU32,
    /// 是否处于熔断状态
    circuit_breaker: AtomicBool,
    /// 熔断触发时间
    circuit_breaker_since: RwLock<Option<Instant>>,
    /// 停止通知
    stop_notify: Arc<Notify>,
    /// 是否正在运行
    running: AtomicBool,
}

impl GatewayManager {
    /// 创建新的 Gateway 管理器
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            child: RwLock::new(None),
            status: RwLock::new(GatewayStatus::Stopped),
            pid: RwLock::new(None),
            token: RwLock::new(None),
            version: RwLock::new(None),
            port: RwLock::new(18789),
            started_at: RwLock::new(None),
            failure_count: AtomicU32::new(0),
            circuit_breaker: AtomicBool::new(false),
            circuit_breaker_since: RwLock::new(None),
            stop_notify: Arc::new(Notify::new()),
            running: AtomicBool::new(false),
        }
    }

    /// 初始化管理器
    pub async fn init(&self) -> Result<(), AppError> {
        log::info!("Gateway 管理器初始化");
        // 检查是否有已运行的 Gateway 实例
        if self.check_existing_gateway().await {
            log::info!("发现已运行的 Gateway 实例");
            *self.status.write() = GatewayStatus::Running;
        }
        Ok(())
    }

    /// 启动 Gateway 进程
    pub async fn start(&self) -> Result<(), AppError> {
        // 检查熔断器
        if self.circuit_breaker.load(Ordering::Relaxed) {
            let since = self.circuit_breaker_since.read();
            if let Some(since_time) = *since {
                if since_time.elapsed() < CIRCUIT_BREAKER_COOLDOWN {
                    return Err(AppError::Gateway(format!(
                        "熔断器已触发，请在 {} 秒后重试",
                        CIRCUIT_BREAKER_COOLDOWN.as_secs() - since_time.elapsed().as_secs()
                    )));
                }
            }
            // 熔断恢复
            self.circuit_breaker.store(false, Ordering::Relaxed);
            self.failure_count.store(0, Ordering::Relaxed);
            *self.circuit_breaker_since.write() = None;
            log::info!("熔断器已恢复");
        }

        // 检查是否已在运行
        if self.status() == GatewayStatus::Running {
            log::warn!("Gateway 已在运行中");
            return Ok(());
        }

        *self.status.write() = GatewayStatus::Starting;
        self.emit_status_event();

        // 生成连接令牌
        let token = Uuid::new_v4().to_string();
        *self.token.write() = Some(token.clone());

        // 启动 Gateway 子进程
        let port = *self.port.read();
        let child = self.spawn_gateway_process(port, &token)?;

        *self.child.write() = Some(child);
        *self.pid.write() = None; // 稍后通过健康检查获取
        *self.started_at.write() = Some(chrono::Utc::now().timestamp());

        // 启动健康检查和监控任务
        let manager = self.clone_handle();
        tauri::async_runtime::spawn(async move {
            manager.monitor_gateway().await;
        });

        log::info!("Gateway 进程已启动，端口: {}", port);
        Ok(())
    }

    /// 停止 Gateway 进程
    pub async fn stop(&self) -> Result<(), AppError> {
        *self.status.write() = GatewayStatus::Stopping;
        self.emit_status_event();

        // 通知监控任务停止
        self.stop_notify.notify_waiters();
        self.running.store(false, Ordering::Relaxed);

        // 终止子进程
        let mut child_guard = self.child.write();
        if let Some(mut child) = child_guard.take() {
            log::info!("正在停止 Gateway 进程 (PID: {:?})", child.id());
            // 先尝试优雅终止
            match child.kill() {
                Ok(_) => {
                    let _ = child.wait();
                    log::info!("Gateway 进程已终止");
                }
                Err(e) => {
                    log::error!("终止 Gateway 进程失败: {}", e);
                }
            }
        }

        *self.status.write() = GatewayStatus::Stopped;
        *self.pid.write() = None;
        *self.started_at.write() = None;
        *self.token.write() = None;
        self.emit_status_event();

        Ok(())
    }

    /// 重启 Gateway 进程
    pub async fn restart(&self) -> Result<(), AppError> {
        log::info!("正在重启 Gateway");
        self.stop().await?;
        sleep(RESTART_DELAY).await;
        self.start().await
    }

    /// 获取当前状态
    pub fn status(&self) -> GatewayStatus {
        self.status.read().clone()
    }

    /// 获取进程 PID
    pub fn pid(&self) -> Option<u32> {
        *self.pid.read()
    }

    /// 获取连接令牌
    pub fn token(&self) -> String {
        self.token
            .read()
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string())
    }

    /// 获取监听端口
    pub fn port(&self) -> u16 {
        *self.port.read()
    }

    /// 设置监听端口
    pub fn set_port(&self, port: u16) {
        *self.port.write() = port;
    }

    /// 检查是否已有 Gateway 实例在运行
    async fn check_existing_gateway(&self) -> bool {
        let port = *self.port.read();
        let url = format!("http://localhost:{}/health", port);
        match reqwest::Client::new()
            .get(&url)
            .timeout(HEALTH_CHECK_TIMEOUT)
            .send()
            .await
        {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    /// 启动 Gateway 子进程
    fn spawn_gateway_process(&self, port: u16, token: &str) -> Result<Child, AppError> {
        // 使用 tauri-plugin-shell 的 Command 来启动 sidecar
        // 这里使用 std::process::Command 作为备选方案
        let child = std::process::Command::new("openclaw")
            .arg("gateway")
            .arg("--port")
            .arg(port.to_string())
            .arg("--token")
            .arg(token)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| AppError::Gateway(format!("启动 Gateway 进程失败: {}", e)))?;

        log::info!("Gateway 进程已创建");
        Ok(child)
    }

    /// 监控 Gateway 进程（健康检查 + 自动重启）
    async fn monitor_gateway(&self) {
        self.running.store(true, Ordering::Relaxed);
        let mut consecutive_failures = 0u32;

        loop {
            // 检查是否应该停止
            if !self.running.load(Ordering::Relaxed) {
                break;
            }

            // 等待一小段时间或停止通知
            tokio::select! {
                _ = sleep(HEALTH_CHECK_INTERVAL) => {}
                _ = self.stop_notify.notified() => {
                    break;
                }
            }

            if !self.running.load(Ordering::Relaxed) {
                break;
            }

            // 执行健康检查
            let port = *self.port.read();
            let url = format!("http://localhost:{}/health", port);
            let healthy = match reqwest::Client::new()
                .get(&url)
                .timeout(HEALTH_CHECK_TIMEOUT)
                .send()
                .await
            {
                Ok(resp) if resp.status().is_success() => {
                    // 更新 PID
                    let mut child_guard = self.child.write();
                    if let Some(ref child) = *child_guard {
                        *self.pid.write() = child.id();
                    }
                    true
                }
                Ok(resp) => {
                    log::warn!("健康检查返回非成功状态: {}", resp.status());
                    false
                }
                Err(e) => {
                    log::warn!("健康检查失败: {}", e);
                    false
                }
            };

            if healthy {
                if *self.status.read() != GatewayStatus::Running {
                    *self.status.write() = GatewayStatus::Running;
                    self.emit_status_event();
                    log::info!("Gateway 健康检查通过");
                }
                consecutive_failures = 0;
            } else {
                consecutive_failures += 1;
                log::warn!(
                    "Gateway 健康检查失败 (连续 {} 次)",
                    consecutive_failures
                );

                // 检查进程是否已退出
                let mut child_guard = self.child.write();
                let process_dead = if let Some(ref mut child) = *child_guard {
                    matches!(child.try_wait(), Ok(Some(_)))
                } else {
                    true
                };

                if process_dead {
                    *child_guard = None;
                    *self.status.write() = GatewayStatus::Stopped;
                    self.emit_status_event();

                    // 增加失败计数
                    let failures = self.failure_count.fetch_add(1, Ordering::Relaxed) + 1;

                    // 检查熔断器
                    if failures >= MAX_CONSECUTIVE_FAILURES {
                        self.circuit_breaker.store(true, Ordering::Relaxed);
                        *self.circuit_breaker_since.write() = Some(Instant::now());
                        log::error!(
                            "连续失败 {} 次，触发熔断器",
                            failures
                        );
                        break;
                    }

                    // 尝试自动重启
                    if self.running.load(Ordering::Relaxed) {
                        log::info!("尝试自动重启 Gateway...");
                        drop(child_guard);
                        sleep(RESTART_DELAY).await;
                        if let Err(e) = self.start().await {
                            log::error!("自动重启失败: {}", e);
                        }
                    }
                }
            }
        }

        log::info!("Gateway 监控任务已退出");
    }

    /// 发送状态变更事件到前端
    fn emit_status_event(&self) {
        let status = self.status.read().clone();
        let pid = *self.pid.read();
        let port = *self.port.read();
        let token = self.token.read().clone();
        let started_at = *self.started_at.read();

        let _ = self.app_handle.emit("gateway://status-changed", serde_json::json!({
            "status": format!("{:?}", status).to_lowercase(),
            "pid": pid,
            "port": port,
            "token": token,
            "started_at": started_at,
        }));
    }

    /// 克隆管理器句柄（用于异步任务）
    fn clone_handle(&self) -> GatewayManagerHandle {
        GatewayManagerHandle {
            app_handle: self.app_handle.clone(),
            status: self.status.data_ptr(),
            pid: self.pid.data_ptr(),
            token: self.token.data_ptr(),
            port: self.port.data_ptr(),
            started_at: self.started_at.data_ptr(),
            child: self.child.data_ptr(),
            failure_count: &self.failure_count,
            circuit_breaker: &self.circuit_breaker,
            circuit_breaker_since: self.circuit_breaker_since.data_ptr(),
            stop_notify: self.stop_notify.clone(),
            running: &self.running,
        }
    }
}

/// Gateway 管理器句柄（用于异步任务中引用管理器）
struct GatewayManagerHandle {
    app_handle: AppHandle,
    status: *const std::cell::UnsafeCell<GatewayStatus>,
    pid: *const std::cell::UnsafeCell<Option<u32>>,
    token: *const std::cell::UnsafeCell<Option<String>>,
    port: *const std::cell::UnsafeCell<u16>,
    started_at: *const std::cell::UnsafeCell<Option<i64>>,
    child: *const std::cell::UnsafeCell<Option<Child>>,
    failure_count: &AtomicU32,
    circuit_breaker: &AtomicBool,
    circuit_breaker_since: *const std::cell::UnsafeCell<Option<Instant>>,
    stop_notify: Arc<Notify>,
    running: &AtomicBool,
}
