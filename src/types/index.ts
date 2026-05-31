//! OpenClaw TypeScript 类型定义
//! 包含所有全局共享的类型

/** Gateway 运行状态 */
export type GatewayStatus = "stopped" | "starting" | "running" | "stopping" | "error";

/** Gateway 信息 */
export interface GatewayInfo {
  status: GatewayStatus;
  pid: number | null;
  port: number;
  ws_url: string;
  token: string | null;
  version: string | null;
  started_at: number | null;
  connected: boolean;
}

/** 应用设置 */
export interface AppSettings {
  gateway_port: number;
  gateway_url: string;
  auto_start_gateway: boolean;
  theme: "dark" | "light" | "system";
  language: "zh" | "en";
  notifications_enabled: boolean;
  minimize_to_tray: boolean;
  start_minimized: boolean;
  extra: Record<string, unknown>;
}

/** 系统信息 */
export interface SystemInfo {
  os: string;
  os_version: string;
  arch: string;
  app_version: string;
  tauri_version: string;
}

/** 聊天消息角色 */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/** 聊天消息 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  session_id: string;
  /** 是否正在流式传输中 */
  streaming?: boolean;
  /** 工具调用信息 */
  tool_calls?: ToolCall[];
  /** 工具调用结果 */
  tool_results?: ToolResult[];
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/** 工具调用 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  status: "pending" | "running" | "completed" | "error";
  result?: string;
}

/** 工具调用结果 */
export interface ToolResult {
  tool_call_id: string;
  content: string;
  is_error?: boolean;
}

/** 会话信息 */
export interface Session {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
  /** 最后一条消息预览 */
  last_message?: string;
  /** 渠道 ID */
  channel_id?: string;
  /** 是否固定 */
  pinned?: boolean;
}

/** 渠道信息 */
export interface Channel {
  id: string;
  name: string;
  type: "direct" | "group" | "channel";
  description?: string;
  icon?: string;
  /** 成员数量 */
  member_count?: number;
  /** 是否已订阅 */
  subscribed: boolean;
  /** 最后活跃时间 */
  last_active?: number;
}

/** 侧边栏导航项 */
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}
