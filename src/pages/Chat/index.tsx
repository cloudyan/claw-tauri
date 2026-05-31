/**
 * Chat 聊天主页
 *
 * 聊天页面主组件，包含消息列表和输入框。
 */

import React, { useEffect } from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import { useChat } from "@/hooks/useChat";
import { useGateway } from "@/hooks/useGateway";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

/**
 * Chat 聊天主页
 */
const Chat: React.FC = () => {
  const { connectionState } = useGateway();
  const { focusInput } = useChat();

  // 页面加载时聚焦输入框
  useEffect(() => {
    focusInput();
  }, [focusInput]);

  return (
    <div className="flex flex-col h-full">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          {connectionState === "connecting" ? (
            <Loader2 size={14} className="animate-spin text-yellow-400" />
          ) : connectionState === "connected" ? (
            <Wifi size={14} className="text-green-400" />
          ) : (
            <WifiOff size={14} className="text-[var(--color-text-muted)]" />
          )}
          <StatusBadge
            status={
              connectionState === "connected"
                ? "success"
                : connectionState === "connecting"
                  ? "warning"
                  : "neutral"
            }
            label={
              connectionState === "connected"
                ? "已连接"
                : connectionState === "connecting"
                  ? "连接中..."
                  : "未连接"
            }
          />
        </div>
      </div>

      {/* 消息列表 */}
      <MessageList />

      {/* 输入框 */}
      <ChatInput />
    </div>
  );
};

export default Chat;
