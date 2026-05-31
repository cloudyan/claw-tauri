/**
 * Tauri Command 封装
 *
 * 封装所有从前端调用的 Tauri 命令，提供类型安全的调用接口。
 */

import { invoke } from "@tauri-apps/api/core";
import type { GatewayInfo, AppSettings, SystemInfo } from "@/types";

/** Gateway 命令 */
export const gatewayCommands = {
  /** 启动 Gateway 进程 */
  start: (): Promise<GatewayInfo> =>
    invoke<GatewayInfo>("start_gateway"),

  /** 停止 Gateway 进程 */
  stop: (): Promise<GatewayInfo> =>
    invoke<GatewayInfo>("stop_gateway"),

  /** 重启 Gateway 进程 */
  restart: (): Promise<GatewayInfo> =>
    invoke<GatewayInfo>("restart_gateway"),

  /** 获取 Gateway 状态 */
  getStatus: (): Promise<GatewayInfo> =>
    invoke<GatewayInfo>("get_gateway_status"),

  /** 连接到 Gateway（WebSocket） */
  connect: (): Promise<GatewayInfo> =>
    invoke<GatewayInfo>("connect_gateway"),

  /** 断开 Gateway 连接 */
  disconnect: (): Promise<GatewayInfo> =>
    invoke<GatewayInfo>("disconnect_gateway"),
};

/** 设置命令 */
export const settingsCommands = {
  /** 获取所有设置 */
  getAll: (): Promise<AppSettings> =>
    invoke<AppSettings>("get_settings"),

  /** 设置所有配置 */
  setAll: (settings: AppSettings): Promise<AppSettings> =>
    invoke<AppSettings>("set_settings", { settings }),

  /** 获取单个设置项 */
  get: (key: string): Promise<unknown | null> =>
    invoke<unknown | null>("get_setting", { key }),

  /** 设置单个配置项 */
  set: (key: string, value: unknown): Promise<unknown> =>
    invoke<unknown>("set_setting", { key, value }),
};

/** 系统命令 */
export const systemCommands = {
  /** 打开外部 URL */
  openUrl: (url: string): Promise<void> =>
    invoke<void>("open_url", { url }),

  /** 显示系统通知 */
  showNotification: (title: string, body: string): Promise<void> =>
    invoke<void>("show_notification", { title, body }),

  /** 获取系统信息 */
  getSystemInfo: (): Promise<SystemInfo> =>
    invoke<SystemInfo>("get_system_info"),
};
