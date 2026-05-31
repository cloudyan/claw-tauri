/**
 * Gateway WebSocket 客户端（浏览器端）
 *
 * 浏览器端 WebSocket 客户端，支持：
 * - 连接 Gateway（获取 wsUrl + token 从 Tauri command）
 * - 三步握手（challenge -> connect -> hello-ok）
 * - RPC 调用（send method + params -> 返回 Promise）
 * - 事件订阅（event listener）
 * - 自动重连（指数退避）
 */

import { type UnlistenFn } from "@tauri-apps/api/event";
import { gatewayCommands } from "./tauri-commands";
import type {
  RequestFrame,
  ResponseFrame,
  EventFrame,
  ConnectParams,
  HelloOkResult,
  GatewayEventMap,
  JsonValue,
} from "./protocol";

/** 连接状态 */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

/** 连接配置 */
export interface GatewayClientConfig {
  /** WebSocket URL（可选，默认从 Tauri 获取） */
  wsUrl?: string;
  /** 连接令牌（可选，默认从 Tauri 获取） */
  token?: string;
  /** 客户端名称 */
  clientName?: string;
  /** 客户端版本 */
  clientVersion?: string;
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 最大重连延迟（毫秒） */
  maxReconnectDelay?: number;
  /** RPC 请求超时（毫秒） */
  rpcTimeout?: number;
}

/** 事件监听器类型 */
type EventListener<T = unknown> = (data: T) => void;

/**
 * Gateway WebSocket 客户端
 */
export class GatewayClient {
  private ws: WebSocket | null = null;
  private config: Required<GatewayClientConfig>;
  private state: ConnectionState = "disconnected";
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: JsonValue) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private eventListeners = new Map<string, Set<EventListener>>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private unlistenFns: UnlistenFn[] = [];
  private clientId: string;

  constructor(config: GatewayClientConfig = {}) {
    this.clientId = crypto.randomUUID();
    this.config = {
      wsUrl: config.wsUrl || "",
      token: config.token || "",
      clientName: config.clientName || "OpenClaw Desktop",
      clientVersion: config.clientVersion || "0.1.0",
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectDelay: config.maxReconnectDelay || 60000,
      rpcTimeout: config.rpcTimeout || 30000,
    };
  }

  /** 获取当前连接状态 */
  getState(): ConnectionState {
    return this.state;
  }

  /** 是否已连接 */
  isConnected(): boolean {
    return this.state === "connected";
  }

  /**
   * 连接到 Gateway
   * 从 Tauri 获取连接信息并执行三步握手
   */
  async connect(): Promise<HelloOkResult> {
    if (this.state === "connected" || this.state === "connecting") {
      return Promise.reject(new Error("已在连接中或已连接"));
    }

    this.setState("connecting");

    try {
      // 从 Tauri 获取连接信息
      const info = await gatewayCommands.getStatus();
      const wsUrl = this.config.wsUrl || `${info.ws_url}/ws`;
      const token = this.config.token || info.token || "";

      // 建立 WebSocket 连接
      const helloOk = await this.doConnect(wsUrl, token);
      this.setState("connected");
      this.reconnectAttempts = 0;
      return helloOk;
    } catch (error) {
      this.setState("error");
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * 执行实际的连接和握手
   */
  private async doConnect(wsUrl: string, token: string): Promise<HelloOkResult> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("连接超时"));
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        this.ws = ws;
        this.setupMessageHandler(ws);
        this.startHandshake(token, resolve, reject);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("WebSocket 连接失败"));
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        if (this.state === "connected") {
          this.setState("disconnected");
          this.scheduleReconnect();
        }
      };
    });
  }

  /**
   * 执行三步握手
   */
  private startHandshake(
    token: string,
    resolve: (result: HelloOkResult) => void,
    reject: (error: Error) => void
  ): void {
    // 步骤 1: 发送 connect.challenge
    const challengeId = this.nextId();
    const challengeRequest: RequestFrame = {
      jsonrpc: "2.0",
      id: challengeId,
      method: "connect.challenge",
    };

    this.sendRaw(challengeRequest);

    // 设置握手超时
    const handshakeTimeout = setTimeout(() => {
      reject(new Error("握手超时"));
    }, 10000);

    // 临时处理握手响应
    const handler = (response: ResponseFrame) => {
      if (response.id === challengeId) {
        // 收到 challenge 响应，发送 connect
        const connectId = this.nextId();
        const connectParams: ConnectParams = {
          clientId: this.clientId,
          clientName: this.config.clientName,
          clientVersion: this.config.clientVersion,
          token: token || undefined,
        };

        const connectRequest: RequestFrame = {
          jsonrpc: "2.0",
          id: connectId,
          method: "connect",
          params: connectParams as unknown as JsonValue,
        };

        this.sendRaw(connectRequest);

        // 设置第二次握手响应处理
        const connectHandler = (connectResponse: ResponseFrame) => {
          if (connectResponse.id === connectId) {
            clearTimeout(handshakeTimeout);
            this.removePendingHandler(challengeId);
            this.removePendingHandler(connectId);

            if (connectResponse.error) {
              reject(
                new Error(
                  `连接被拒绝: [${connectResponse.error.code}] ${connectResponse.error.message}`
                )
              );
            } else if (connectResponse.result) {
              const helloOk = connectResponse.result as unknown as HelloOkResult;
              resolve(helloOk);
            } else {
              reject(new Error("无效的握手响应"));
            }
          }
        };

        this.setPendingHandler(connectId, connectHandler);
      }
    };

    this.setPendingHandler(challengeId, handler);
  }

  /**
   * 设置 WebSocket 消息处理器
   */
  private setupMessageHandler(ws: WebSocket): void {
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as ResponseFrame | EventFrame;

        // 检查是否有 pending handler（握手用）
        if ("id" in data && data.id !== undefined) {
          const handler = this.getPendingHandler(data.id);
          if (handler) {
            handler(data as ResponseFrame);
            return;
          }

          // 检查是否有 pending RPC 请求
          const pending = this.pendingRequests.get(data.id);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingRequests.delete(data.id);

            const response = data as ResponseFrame;
            if (response.error) {
              pending.reject(
                new Error(
                  `[${response.error.code}] ${response.error.message}`
                )
              );
            } else if (response.result !== undefined) {
              pending.resolve(response.result);
            } else {
              pending.reject(new Error("无效的响应"));
            }
            return;
          }
        }

        // 事件帧
        if ("method" in data && !("id" in data)) {
          const eventFrame = data as EventFrame;
          this.emitEvent(eventFrame.method, eventFrame.params);
        }
      } catch {
        // 忽略解析错误
      }
    };
  }

  /**
   * 发送 RPC 请求
   */
  async call<T = JsonValue>(
    method: string,
    params?: JsonValue
  ): Promise<T> {
    if (this.state !== "connected") {
      return Promise.reject(new Error("未连接到 Gateway"));
    }

    const id = this.nextId();
    const request: RequestFrame = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`RPC 请求超时: ${method}`));
      }, this.config.rpcTimeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: JsonValue) => void,
        reject,
        timer,
      });

      this.sendRaw(request);
    });
  }

  /**
   * 发送原始数据
   */
  private sendRaw(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * 订阅 Gateway 事件
   */
  on<K extends keyof GatewayEventMap>(
    event: K,
    listener: EventListener<GatewayEventMap[K]>
  ): () => void {
    if (!this.eventListeners.has(event as string)) {
      this.eventListeners.set(event as string, new Set());
    }
    this.eventListeners.get(event as string)!.add(listener as EventListener);

    // 返回取消订阅函数
    return () => {
      const listeners = this.eventListeners.get(event as string);
      if (listeners) {
        listeners.delete(listener as EventListener);
      }
    };
  }

  /**
   * 订阅所有事件
   */
  onAny(listener: EventListener<{ method: string; params: JsonValue }>): () => void {
    return this.on("*" as keyof GatewayEventMap, listener as EventListener);
  }

  /**
   * 触发事件
   */
  private emitEvent(method: string, params: JsonValue | undefined): void {
    // 触发特定事件监听器
    const listeners = this.eventListeners.get(method);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(params);
        } catch (error) {
          console.error(`事件处理器错误 [${method}]:`, error);
        }
      });
    }

    // 触发通配符监听器
    const anyListeners = this.eventListeners.get("*");
    if (anyListeners) {
      anyListeners.forEach((listener) => {
        try {
          listener({ method, params: params || null });
        } catch (error) {
          console.error("通配符事件处理器错误:", error);
        }
      });
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.cancelReconnect();
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.reject(new Error("连接已断开"));
    });
    this.pendingRequests.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState("disconnected");
  }

  /**
   * 计划自动重连
   */
  private scheduleReconnect(): void {
    if (!this.config.autoReconnect) return;

    this.cancelReconnect();

    // 指数退避
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelay
    );
    this.reconnectAttempts++;

    console.log(
      `将在 ${delay}ms 后重连 (第 ${this.reconnectAttempts} 次)`
    );

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error("自动重连失败:", error);
      }
    }, delay);
  }

  /**
   * 取消重连
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 设置连接状态
   */
  private setState(state: ConnectionState): void {
    this.state = state;
    this.emitEvent("connection.state_changed", state as unknown as JsonValue);
  }

  /**
   * 生成下一个请求 ID
   */
  private nextId(): number {
    return ++this.requestId;
  }

  /**
   * 临时 pending handler（握手用）
   */
  private handshakeHandlers = new Map<number, (response: ResponseFrame) => void>();

  private setPendingHandler(id: number, handler: (response: ResponseFrame) => void): void {
    this.handshakeHandlers.set(id, handler);
  }

  private getPendingHandler(id: number): ((response: ResponseFrame) => void) | undefined {
    return this.handshakeHandlers.get(id);
  }

  private removePendingHandler(id: number): void {
    this.handshakeHandlers.delete(id);
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.unlistenFns.forEach((fn) => fn());
    this.unlistenFns = [];
  }
}

/** 全局单例客户端 */
let clientInstance: GatewayClient | null = null;

/**
 * 获取 Gateway 客户端单例
 */
export function getGatewayClient(config?: GatewayClientConfig): GatewayClient {
  if (!clientInstance) {
    clientInstance = new GatewayClient(config);
  }
  return clientInstance;
}

/**
 * 销毁 Gateway 客户端单例
 */
export function destroyGatewayClient(): void {
  if (clientInstance) {
    clientInstance.destroy();
    clientInstance = null;
  }
}
