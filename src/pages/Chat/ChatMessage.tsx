/**
 * ChatMessage 消息气泡组件
 *
 * 渲染单条聊天消息，支持 Markdown、代码高亮和工具调用卡片。
 */

import React from "react";
import { clsx } from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Wrench, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ChatMessage as ChatMessageType, ToolCall } from "@/types";

/** ChatMessage 组件属性 */
interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * 工具调用卡片
 */
const ToolCallCard: React.FC<{ toolCall: ToolCall }> = ({ toolCall }) => {
  const statusIcon = {
    pending: <Loader2 size={14} className="animate-spin text-yellow-400" />,
    running: <Loader2 size={14} className="animate-spin text-blue-400" />,
    completed: <CheckCircle2 size={14} className="text-green-400" />,
    error: <AlertCircle size={14} className="text-red-400" />,
  };

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs">
      <div className="flex items-center gap-2">
        <Wrench size={12} className="text-[var(--color-text-muted)]" />
        <span className="font-mono font-medium text-[var(--color-text-primary)]">
          {toolCall.name}
        </span>
        {statusIcon[toolCall.status]}
      </div>
      {toolCall.result && (
        <pre className="p-2 rounded bg-[var(--color-bg-primary)] overflow-x-auto text-[var(--color-text-secondary)]">
          {toolCall.result.length > 500
            ? toolCall.result.substring(0, 500) + "..."
            : toolCall.result}
        </pre>
      )}
    </div>
  );
};

/**
 * ChatMessage 消息气泡
 */
const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={clsx(
        "flex gap-3 px-4 py-3 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* 头像 */}
      <div
        className={clsx(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          isUser
            ? "bg-claw-600 text-white"
            : isSystem
              ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
              : "bg-blue-600 text-white"
        )}
      >
        {isUser ? (
          <User size={16} />
        ) : isSystem ? (
          <AlertCircle size={16} />
        ) : (
          <Bot size={16} />
        )}
      </div>

      {/* 消息内容 */}
      <div
        className={clsx(
          "flex flex-col gap-2 max-w-[75%] min-w-0",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* 消息气泡 */}
        <div
          className={clsx(
            "rounded-xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-claw-600 text-white rounded-tr-sm"
              : "bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-tl-sm"
          )}
        >
          {message.content ? (
            isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <div className="prose-claw">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )
          ) : message.streaming ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-claw-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-claw-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-claw-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                思考中...
              </span>
            </div>
          ) : null}
        </div>

        {/* 工具调用卡片 */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="flex flex-col gap-2 w-full">
            {message.tool_calls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* 时间戳 */}
        <span className="text-[10px] text-[var(--color-text-muted)] px-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
