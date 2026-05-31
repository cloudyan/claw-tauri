// OpenClaw Tauri 应用入口
// 仅在非移动平台编译此文件

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    openclaw_tauri_lib::run()
}
