/**
 * Gateway 连接状态管理
 *
 * 管理 Gateway 进程状态、WebSocket 连接状态和相关操作。
 */

import { create } from "zustand";
import { gatewayCommands } from "@/lib/tauri-commands";
import {
  getGatewayClient,
  type ConnectionState,
} from "@/lib/gateway-client";
import type { HelloOkResult } from "@/lib/protocol";
import type { GatewayInfo } from "@/types";

/** Gateway Store 状态 */
interface GatewayState {
  /** Gateway 进程信息 */
  info: GatewayInfo;
  /** WebSocket 连接状态 */
  connectionState: ConnectionState;
  /** Hello-Ok 响应信息 */
  helloOk: HelloOkResult | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;

  // 操作
  /** 刷新 Gateway 状态 */
  refreshStatus: () => Promise<void>;
  /** 启动 Gateway 进程 */
  start: () => Promise<void>;
  /** 停止 Gateway 进程 */
  stop: () => Promise<void>;
  /** 重启 Gateway 进程 */
  restart: () => Promise<void>;
  /** 连接到 Gateway（WebSocket） */
  connect: () => Promise<void>;
  /** 断开 Gateway 连接 */
  disconnect: () => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
}

/** 初始 Gateway 信息 */
const initialInfo: GatewayInfo = {
  status: "stopped",
  pid: null,
  port: 18789,
  ws_url: "ws://localhost:18789",
  token: null,
  version: null,
  started_at: null,
  connected: false,
};

/**
 * Gateway Store
 */
export const useGatewayStore = create<GatewayState>((set, get) => ({
  info: initialInfo,
  connectionState: "disconnected",
  helloOk: null,
  loading: false,
  error: null,

  refreshStatus: async () => {
    try {
      const info = await gatewayCommands.getStatus();
      set({ info });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  start: async () => {
    set({ loading: true, error: null });
    try {
      const info = await gatewayCommands.start();
      set({ info, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  stop: async () => {
    set({ loading: true, error: null });
    try {
      const info = await gatewayCommands.stop();
      const client = getGatewayClient();
      client.disconnect();
      set({
        info,
        connectionState: "disconnected",
        helloOk: null,
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  restart: async () => {
    set({ loading: true, error: null });
    try {
      const client = getGatewayClient();
      client.disconnect();
      const info = await gatewayCommands.restart();
      set({
        info,
        connectionState: "disconnected",
        helloOk: null,
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  connect: async () => {
    set({ loading: true, error: null, connectionState: "connecting" });
    try {
      const client = getGatewayClient();
      const helloOk = await client.connect();
      set({
        helloOk,
        connectionState: "connected",
        info: { ...get().info, connected: true },
        loading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        connectionState: "error",
        loading: false,
      });
    }
  },

  disconnect: async () => {
    set({ loading: true, error: null });
    try {
      const client = getGatewayClient();
      client.disconnect();
      const info = await gatewayCommands.disconnect();
      set({
        info,
        connectionState: "disconnected",
        helloOk: null,
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
