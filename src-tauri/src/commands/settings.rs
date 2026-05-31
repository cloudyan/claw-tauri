//! 设置相关 Tauri 命令
//!
//! 提供应用设置的读取、写入和持久化功能。

use crate::state::{AppSettings, AppState};
use serde_json::Value;
use tauri::State;

/// 获取所有设置
#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let settings = state.settings.read().clone();
    Ok(settings)
}

/// 设置所有配置（覆盖）
#[tauri::command]
pub async fn set_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    // 更新 Gateway 端口
    if settings.gateway_port != state.settings.read().gateway_port {
        state.gateway_manager.set_port(settings.gateway_port);
    }

    *state.settings.write() = settings.clone();

    // 持久化设置到 Tauri Store
    persist_settings(&state, &settings).await?;

    Ok(settings)
}

/// 获取单个设置项
#[tauri::command]
pub async fn get_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<Value>, String> {
    let settings = state.settings.read();

    let value = match key.as_str() {
        "gateway_port" => Some(Value::Number(settings.gateway_port.into())),
        "gateway_url" => Some(Value::String(settings.gateway_url.clone())),
        "auto_start_gateway" => Some(Value::Bool(settings.auto_start_gateway)),
        "theme" => Some(Value::String(settings.theme.clone())),
        "language" => Some(Value::String(settings.language.clone())),
        "notifications_enabled" => Some(Value::Bool(settings.notifications_enabled)),
        "minimize_to_tray" => Some(Value::Bool(settings.minimize_to_tray)),
        "start_minimized" => Some(Value::Bool(settings.start_minimized)),
        _ => settings.extra.get(&key).cloned(),
    };

    Ok(value)
}

/// 设置单个配置项
#[tauri::command]
pub async fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: Value,
) -> Result<Value, String> {
    let mut settings = state.settings.write();

    match key.as_str() {
        "gateway_port" => {
            if let Some(port) = value.as_u64() {
                settings.gateway_port = port as u16;
                state.gateway_manager.set_port(port as u16);
            }
        }
        "gateway_url" => {
            if let Some(url) = value.as_str() {
                settings.gateway_url = url.to_string();
            }
        }
        "auto_start_gateway" => {
            if let Some(v) = value.as_bool() {
                settings.auto_start_gateway = v;
            }
        }
        "theme" => {
            if let Some(v) = value.as_str() {
                settings.theme = v.to_string();
            }
        }
        "language" => {
            if let Some(v) = value.as_str() {
                settings.language = v.to_string();
            }
        }
        "notifications_enabled" => {
            if let Some(v) = value.as_bool() {
                settings.notifications_enabled = v;
            }
        }
        "minimize_to_tray" => {
            if let Some(v) = value.as_bool() {
                settings.minimize_to_tray = v;
            }
        }
        "start_minimized" => {
            if let Some(v) = value.as_bool() {
                settings.start_minimized = v;
            }
        }
        _ => {
            settings.extra.insert(key, value.clone());
        }
    }

    let updated = settings.clone();
    drop(settings);

    // 持久化
    persist_settings(&state, &updated).await?;

    Ok(value)
}

/// 持久化设置到 Tauri Store
async fn persist_settings(
    state: &AppState,
    settings: &AppSettings,
) -> Result<(), String> {
    let value = serde_json::to_value(settings).map_err(|e| e.to_string())?;

    let store = tauri_plugin_store::StoreBuilder::new(
        &state.app_handle,
        "settings.json".parse().unwrap(),
    )
    .build()
    .map_err(|e| e.to_string())?;

    store.set("app_settings", value);
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}
