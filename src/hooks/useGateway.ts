/**
 * Gateway 连接 Hook
 *
 * 封装 Gateway 连接管理逻辑，提供自动连接、状态监听和事件处理。
 */

import { useEffect, useCallback, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useGatewayStore } from "@/stores/gateway";
import { useChatStore } from "@/stores/chat";
import { getGatewayClient } from "@/lib/gateway-client";
import type { GatewayInfo } from "@/types";
import type { MessageEventParams, ToolCallEvent } from "@/lib/protocol";

/**
 * Gateway 连接 Hook
 * 自动管理 Gateway 状态监听、事件转发和生命周期
 */
export function useGateway() {
  const store = useGatewayStore();
  const unlistenFns = useRef<UnlistenFn[]>([]);

  // 初始化：加载状态和设置事件监听
  useEffect(() => {
    // 加载 Gateway 状态
    store.refreshStatus();

    // 监听 Gateway 状态变更事件（来自 Rust 后端）
    const unlisten1 = listen<GatewayInfo>(
      "gateway://status-changed",
      (event) => {
        useGatewayStore.setState({ info: event.payload });
      }
    );

    // 监听 Gateway 连接成功事件
    const unlisten2 = listen("gateway://connected", () => {
      useGatewayStore.setState({ connectionState: "connected" });
    });

    // 监听 Gateway 断开连接事件
    const unlisten3 = listen("gateway://disconnected", () => {
      useGatewayStore.setState({ connectionState: "disconnected" });
    });

    // 监听 Gateway 连接错误事件
    const unlisten4 = listen<{ error: string }>(
      "gateway://connection-error",
      (event) => {
        useGatewayStore.setState({
          connectionState: "error",
          error: event.payload.error,
        });
      }
    );

    // 监听 Gateway 事件（来自 Rust 后端转发）
    const unlisten5 = listen<{
      method: string;
      params: unknown;
    }>("gateway://event", (event) => {
      const { method, params } = event.payload;

      // 转发消息事件到 Chat Store
      if (
        method === "message.delta" ||
        method === "message.complete"
      ) {
        useChatStore.getState().handleMessageEvent(
          params as MessageEventParams
        );
      }

      // 转发工具事件到 Chat Store
      if (
        method === "tool.started" ||
        method === "tool.progress" ||
        method === "tool.completed"
      ) {
        useChatStore.getState().handleToolEvent(
          params as ToolCallEvent
        );
      }
    });

    Promise.all([unlisten1, unlisten2, unlisten3, unlisten4, unlisten5]).then(
      (fns) => {
        unlistenFns.current = fns;
      }
    );

    return () => {
      unlistenFns.current.forEach((fn) => fn());
    };
  }, []);

  // 设置 Gateway 客户端事件监听（浏览器端 WebSocket 事件）
  useEffect(() => {
    const client = getGatewayClient();

    // 监听消息事件
    const unsub1 = client.on("message.delta", (params) => {
      useChatStore.getState().handleMessageEvent(
        params as unknown as MessageEventParams
      );
    });

    const unsub2 = client.on("message.complete", (params) => {
      useChatStore.getState().handleMessageEvent(
        params as unknown as MessageEventParams
      );
    });

    const unsub3 = client.on("tool.started", (params) => {
      useChatStore.getState().handleToolEvent(
        params as unknown as ToolCallEvent
      );
    });

    const unsub4 = client.on("tool.completed", (params) => {
      useChatStore.getState().handleToolEvent(
        params as unknown as ToolCallEvent
      );
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  /** 连接 Gateway（自动启动 + WebSocket 连接） */
  const connectWithAutoStart = useCallback(async () => {
    // 如果 Gateway 未运行，先启动
    if (store.info.status === "stopped" || store.info.status === "error") {
      await store.start();
      // 等待 Gateway 启动
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    // 连接 WebSocket
    await store.connect();
  }, [store]);

  return {
    ...store,
    connectWithAutoStart,
  };
}
