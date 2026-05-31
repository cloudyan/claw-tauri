/**
 * OpenClaw 协议类型定义
 *
 * 定义 OpenClaw Gateway WebSocket JSON-RPC 协议的所有帧类型，
 * 包括请求帧、响应帧、事件帧和握手协议相关类型。
 */

/** JSON-RPC 请求帧 */
export interface RequestFrame {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: JsonValue;
}

/** JSON-RPC 响应帧 */
export interface ResponseFrame {
  jsonrpc: "2.0";
  id?: number;
  result?: JsonValue;
  error?: RpcError;
}

/** JSON-RPC 错误 */
export interface RpcError {
  code: number;
  message: string;
  data?: JsonValue;
}

/** JSON-RPC 事件帧（无 id 字段） */
export interface EventFrame {
  jsonrpc: "2.0";
  method: string;
  params?: JsonValue;
}

/** 连接挑战参数 */
export interface ChallengeParams {
  methods: string[];
  challenge: string;
}

/** 连接参数 */
export interface ConnectParams {
  clientId: string;
  clientName: string;
  clientVersion: string;
  token?: string;
}

/** Hello-Ok 响应数据 */
export interface HelloOkResult {
  serverVersion: string;
  serverName: string;
  capabilities: JsonValue;
}

/** 消息发送参数 */
export interface SendMessageParams {
  sessionId: string;
  content: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

/** 消息事件参数 */
export interface MessageEventParams {
  sessionId: string;
  messageId: string;
  role: string;
  content: string;
  timestamp: number;
  streaming?: boolean;
  done?: boolean;
  toolCalls?: ToolCallEvent[];
}

/** 工具调用事件 */
export interface ToolCallEvent {
  id: string;
  name: string;
  arguments: string;
  status: "started" | "progress" | "completed" | "error";
  result?: string;
}

/** 会话列表参数 */
export interface ListSessionsParams {
  offset?: number;
  limit?: number;
}

/** 会话信息 */
export interface SessionInfo {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessage?: string;
}

/** 渠道列表参数 */
export interface ListChannelsParams {
  offset?: number;
  limit?: number;
}

/** 渠道信息 */
export interface ChannelInfo {
  id: string;
  name: string;
  type: "direct" | "group" | "channel";
  description?: string;
  memberCount?: number;
  subscribed: boolean;
  lastActive?: number;
}

/** JSON 值类型 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Gateway 事件类型映射 */
export interface GatewayEventMap {
  "message.delta": MessageEventParams;
  "message.complete": MessageEventParams;
  "session.created": SessionInfo;
  "session.updated": SessionInfo;
  "session.deleted": { sessionId: string };
  "channel.updated": ChannelInfo;
  "tool.started": ToolCallEvent;
  "tool.progress": ToolCallEvent;
  "tool.completed": ToolCallEvent;
  "error": { code: number; message: string; data?: JsonValue };
}
