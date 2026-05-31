/**
 * Dialog 对话框组件
 *
 * 模态对话框，支持标题、内容和底部操作区。
 */

import React, { useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";

/** Dialog 组件属性 */
interface DialogProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 对话框标题 */
  title?: string;
  /** 对话框宽度 */
  width?: "sm" | "md" | "lg" | "xl";
  /** 子内容 */
  children: React.ReactNode;
}

/** DialogHeader 属性 */
interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

/** DialogContent 属性 */
interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

/** DialogFooter 属性 */
interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

/** 宽度样式映射 */
const widthStyles: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

/**
 * Dialog 对话框
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  width = "md",
  children,
}) => {
  // ESC 键关闭
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* 对话框主体 */}
      <div
        className={clsx(
          "relative w-full mx-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-2xl",
          "animate-slide-up",
          widthStyles[width]
        )}
      >
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

/**
 * DialogHeader 对话框头部（标题下方）
 */
export const DialogHeader: React.FC<DialogHeaderProps> = ({
  className,
  children,
}) => {
  return <div className={clsx("px-5 pt-4", className)}>{children}</div>;
};

/**
 * DialogContent 对话框内容
 */
export const DialogContent: React.FC<DialogContentProps> = ({
  className,
  children,
}) => {
  return (
    <div className={clsx("px-5 py-4", className)}>{children}</div>
  );
};

/**
 * DialogFooter 对话框底部操作区
 */
export const DialogFooter: React.FC<DialogFooterProps> = ({
  className,
  children,
}) => {
  return (
    <div
      className={clsx(
        "flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--color-border)]",
        className
      )}
    >
      {children}
    </div>
  );
};
