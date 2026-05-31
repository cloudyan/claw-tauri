/**
 * 聊天 Hook
 *
 * 封装聊天相关操作，提供消息发送、会话管理和键盘快捷键。
 */

import { useCallback, useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat";
import { useGatewayStore } from "@/stores/gateway";

/**
 * 聊天 Hook
 * 提供聊天操作的便捷接口
 */
export function useChat() {
  const store = useChatStore();
  const gatewayStore = useGatewayStore();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // 自动滚动到底部
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [store.messages]);

  /** 发送消息（带前置检查） */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // 检查是否已连接
      if (gatewayStore.connectionState !== "connected") {
        // 尝试自动连接
        try {
          await gatewayStore.connect();
        } catch {
          return;
        }
      }

      await store.sendMessage(content);
    },
    [store, gatewayStore]
  );

  /** 处理键盘事件 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter 发送，Shift+Enter 换行
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(store.inputText);
      }
    },
    [sendMessage, store.inputText]
  );

  /** 聚焦输入框 */
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return {
    ...store,
    sendMessage,
    handleKeyDown,
    focusInput,
    inputRef,
    messagesEndRef,
  };
}
