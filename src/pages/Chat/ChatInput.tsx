/**
 * ChatInput 消息输入框组件
 *
 * 支持多行输入、键盘快捷键和发送/停止操作。
 */

import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { Send, Square, Paperclip } from "lucide-react";
import { useChat } from "@/hooks/useChat";

/**
 * ChatInput 消息输入框
 */
const ChatInput: React.FC = () => {
  const { t } = useTranslation();
  const {
    inputText,
    setInputText,
    sending,
    handleKeyDown,
    sendMessage,
    stopGeneration,
    inputRef,
  } = useChat();

  // 自动调整高度
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  /** 处理发送 */
  const handleSend = () => {
    if (sending) {
      stopGeneration();
    } else if (inputText.trim()) {
      sendMessage(inputText);
    }
  };

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
      <div className="flex items-end gap-3">
        {/* 附件按钮（占位） */}
        <button
          className="flex-shrink-0 p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          title={t("chat.attach_file")}
        >
          <Paperclip size={18} />
        </button>

        {/* 输入区域 */}
        <div className="flex-1 relative">
          <textarea
            ref={(el) => {
              textareaRef.current = el;
              if (inputRef) {
                (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
              }
            }}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.input_placeholder")}
            rows={1}
            className={clsx(
              "w-full resize-none rounded-xl border border-[var(--color-border)]",
              "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]",
              "placeholder:text-[var(--color-text-muted)]",
              "px-4 py-2.5 text-sm leading-relaxed",
              "focus:outline-none focus:ring-2 focus:ring-claw-500/50 focus:border-claw-500",
              "transition-colors duration-200",
              "max-h-[200px]"
            )}
          />
        </div>

        {/* 发送/停止按钮 */}
        <button
          onClick={handleSend}
          className={clsx(
            "flex-shrink-0 p-2.5 rounded-xl transition-all duration-200",
            sending
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-claw-600 text-white hover:bg-claw-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          disabled={!sending && !inputText.trim()}
          title={sending ? t("chat.stop") : t("chat.send")}
        >
          {sending ? <Square size={16} /> : <Send size={16} />}
        </button>
      </div>

      {/* 底部提示 */}
      <div className="flex items-center justify-between mt-1.5 px-1">
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {t("chat.hint")}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          Enter {t("chat.send")}, Shift+Enter {t("chat.newline")}
        </span>
      </div>
    </div>
  );
};

export default ChatInput;
