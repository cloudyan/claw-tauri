//! OpenClaw Tauri 桌面客户端 - 库入口
//!
//! 包含应用初始化、插件注册、命令注册和系统托盘配置。

mod commands;
mod gateway;
mod state;
#[cfg(target_os = "macos")]
mod tray;

use tauri::Manager;

/// 应用启动入口
pub fn run() {
    // 初始化日志
    env_logger::init();

    tauri::Builder::default()
        // 注册 Tauri 插件
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        // 注册应用状态
        .setup(|app| {
            // 初始化应用状态
            let app_state = state::AppState::new(app.handle())?;
            app.manage(app_state);

            // 初始化系统托盘（仅 macOS）
            #[cfg(target_os = "macos")]
            {
                tray::setup_tray(app)?;
            }

            // 初始化 Gateway 管理器
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let state = handle.state::<state::AppState>();
                if let Err(e) = state.gateway_manager.init().await {
                    log::error!("Gateway 管理器初始化失败: {}", e);
                }
            });

            log::info!("OpenClaw 应用初始化完成");
            Ok(())
        })
        // 注册 Tauri 命令
        .invoke_handler(tauri::generate_handler![
            // Gateway 命令
            commands::gateway::start_gateway,
            commands::gateway::stop_gateway,
            commands::gateway::restart_gateway,
            commands::gateway::get_gateway_status,
            commands::gateway::connect_gateway,
            commands::gateway::disconnect_gateway,
            // 设置命令
            commands::settings::get_settings,
            commands::settings::set_settings,
            commands::settings::get_setting,
            commands::settings::set_setting,
            // 系统命令
            commands::system::open_url,
            commands::system::show_notification,
            commands::system::get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("启动 OpenClaw 应用时出错");
}
