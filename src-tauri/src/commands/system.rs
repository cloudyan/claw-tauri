//! 系统相关 Tauri 命令
//!
//! 提供系统级操作命令：打开 URL、显示通知、获取系统信息。

use serde::Serialize;
use tauri::State;
use crate::state::AppState;

/// 系统信息
#[derive(Debug, Clone, Serialize)]
pub struct SystemInfo {
    /// 操作系统
    pub os: String,
    /// 操作系统版本
    pub os_version: String,
    /// 架构
    pub arch: String,
    /// 应用版本
    pub app_version: String,
    /// Tauri 版本
    pub tauri_version: String,
}

/// 打开外部 URL
#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("无法打开 URL: {}", e))
}

/// 显示系统通知
#[tauri::command]
pub async fn show_notification(
    state: State<'_, AppState>,
    title: String,
    body: String,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    state
        .app_handle
        .notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| format!("显示通知失败: {}", e))?;

    Ok(())
}

/// 获取系统信息
#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    let os_info = os_info::get();

    Ok(SystemInfo {
        os: os_info.os_type().to_string(),
        os_version: os_info.version().to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        tauri_version: "2.0".to_string(),
    })
}
