//! Gateway 相关 Tauri 命令
//!
//! 提供前端调用的 Gateway 管理命令：启动、停止、重启、状态查询、连接/断开。

use crate::gateway::connection::GatewayConnection;
use crate::state::{AppState, GatewayInfo};
use tauri::State;

/// 启动 Gateway 进程
#[tauri::command]
pub async fn start_gateway(state: State<'_, AppState>) -> Result<GatewayInfo, String> {
    state
        .gateway_manager
        .start()
        .await
        .map_err(|e| e.to_string())?;

    // 等待一小段时间让状态更新
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    Ok(state.get_gateway_info())
}

/// 停止 Gateway 进程
#[tauri::command]
pub async fn stop_gateway(state: State<'_, AppState>) -> Result<GatewayInfo, String> {
    state
        .gateway_manager
        .stop()
        .await
        .map_err(|e| e.to_string())?;

    Ok(state.get_gateway_info())
}

/// 重启 Gateway 进程
#[tauri::command]
pub async fn restart_gateway(state: State<'_, AppState>) -> Result<GatewayInfo, String> {
    state
        .gateway_manager
        .restart()
        .await
        .map_err(|e| e.to_string())?;

    Ok(state.get_gateway_info())
}

/// 获取 Gateway 状态信息
#[tauri::command]
pub async fn get_gateway_status(state: State<'_, AppState>) -> Result<GatewayInfo, String> {
    Ok(state.get_gateway_info())
}

/// 连接到 Gateway（WebSocket）
#[tauri::command]
pub async fn connect_gateway(state: State<'_, AppState>) -> Result<GatewayInfo, String> {
    let settings = state.settings.read();
    let ws_url = format!("ws://localhost:{}/ws", settings.gateway_port);
    let token = state.gateway_manager.token();
    drop(settings);

    let connection = GatewayConnection::new(ws_url, token, state.app_handle.clone());

    connection
        .connect()
        .await
        .map_err(|e| e.to_string())?;

    *state.gateway_connection.write() = Some(connection);

    Ok(state.get_gateway_info())
}

/// 断开 Gateway WebSocket 连接
#[tauri::command]
pub async fn disconnect_gateway(state: State<'_, AppState>) -> Result<GatewayInfo, String> {
    let mut conn_guard = state.gateway_connection.write();
    if let Some(ref connection) = *conn_guard {
        connection
            .disconnect()
            .await
            .map_err(|e| e.to_string())?;
    }
    *conn_guard = None;

    Ok(state.get_gateway_info())
}
