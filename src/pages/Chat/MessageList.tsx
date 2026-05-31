/**
 * MessageList 消息列表组件
 *
 * 渲染聊天消息列表，支持自动滚动到底部。
 */

import React, { useRef, useEffect } from "react";
import { useChatStore } from "@/stores/chat";
import ChatMessage from "./ChatMessage";

/**
 * MessageList 消息列表
 */
const MessageList: React.FC = () => {
  const messages = useChatStore((s) => s.messages);
  const loading = useChatStore((s) => s.loading);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-2 border-claw-500 border-t-transparent rounded-full" />
          <span className="text-sm text-[var(--color-text-muted)]">
            加载消息中...
          </span>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-claw-500/10 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-10 h-10"
              fill="none"
            >
              <path
                d="M35 30 L50 20 L65 30 L65 50 L50 60 L35 50 Z"
                fill="#22c55e"
                opacity="0.8"
              />
              <path
                d="M25 45 L35 50 L35 70 L25 65 Z"
                fill="#16a34a"
                opacity="0.6"
              />
              <path
                d="M75 45 L65 50 L65 70 L75 65 Z"
                fill="#16a34a"
                opacity="0.6"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
              OpenClaw
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
              输入消息开始对话，支持 Markdown 格式和工具调用。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col py-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MessageList;
