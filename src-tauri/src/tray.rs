//! 系统托盘模块（仅 macOS）
//!
//! 提供系统托盘图标、菜单和交互功能。

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, CheckMenuItem},
    tray::TrayIconBuilder,
    App, Manager,
};

/// 托盘菜单项 ID
const TRAY_SHOW: &str = "tray_show";
const TRAY_HIDE: &str = "tray_hide";
const TRAY_QUIT: &str = "tray_quit";
const TRAY_TOGGLE_GW: &str = "tray_toggle_gw";

/// 设置系统托盘
pub fn setup_tray(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // 创建菜单项
    let show_item = MenuItem::with_id(app, TRAY_SHOW, "显示窗口", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, TRAY_HIDE, "隐藏窗口", true, None::<&str>)?;
    let toggle_gw = MenuItem::with_id(app, TRAY_TOGGLE_GW, "启动 Gateway", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, TRAY_QUIT, "退出", true, None::<&str>)?;

    // 构建托盘菜单
    let menu = Menu::with_items(
        app,
        &[&show_item, &hide_item, &toggle_gw, &separator, &quit_item],
    )?;

    // 构建系统托盘
    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .menu_on_left_click(false)
        .on_menu_event(move |app, event| {
            handle_tray_event(app, event.id().as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            // 双击托盘图标显示窗口
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

/// 处理托盘菜单事件
fn handle_tray_event(app: &tauri::AppHandle, event_id: &str) {
    match event_id {
        TRAY_SHOW => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        TRAY_HIDE => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        }
        TRAY_TOGGLE_GW => {
            // 切换 Gateway 状态
            let state = app.state::<crate::state::AppState>();
            let manager = &state.gateway_manager;
            match manager.status() {
                crate::state::GatewayStatus::Running => {
                    let _ = tauri::async_runtime::block_on(async {
                        manager.stop().await
                    });
                }
                _ => {
                    let _ = tauri::async_runtime::block_on(async {
                        manager.start().await
                    });
                }
            }
        }
        TRAY_QUIT => {
            // 停止 Gateway 并退出
            let state = app.state::<crate::state::AppState>();
            let _ = tauri::async_runtime::block_on(async {
                state.gateway_manager.stop().await
            });
            app.exit(0);
        }
        _ => {}
    }
}
