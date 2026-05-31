/**
 * StatusBadge 状态徽章组件
 *
 * 显示状态指示，支持多种状态类型。
 */

import React from "react";
import { clsx } from "clsx";

/** 状态类型 */
type StatusType = "success" | "warning" | "error" | "info" | "neutral";

/** StatusBadge 组件属性 */
interface StatusBadgeProps {
  /** 状态类型 */
  status: StatusType;
  /** 显示文本 */
  label: string;
  /** 是否显示脉冲动画 */
  pulse?: boolean;
  className?: string;
}

/** 状态样式映射 */
const statusStyles: Record<StatusType, string> = {
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  neutral: "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
};

/** 状态点颜色映射 */
const dotColors: Record<StatusType, string> = {
  success: "bg-green-400",
  warning: "bg-yellow-400",
  error: "bg-red-400",
  info: "bg-blue-400",
  neutral: "bg-[var(--color-text-muted)]",
};

/**
 * StatusBadge 状态徽章
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  pulse = false,
  className,
}) => {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        statusStyles[status],
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={clsx(
              "absolute inset-0 rounded-full animate-ping opacity-75",
              dotColors[status]
            )}
          />
        )}
        <span
          className={clsx(
            "relative inline-flex h-2 w-2 rounded-full",
            dotColors[status]
          )}
        />
      </span>
      {label}
    </span>
  );
};
