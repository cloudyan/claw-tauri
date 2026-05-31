/**
 * Input 输入框组件
 *
 * 支持前缀/后缀图标、不同尺寸和状态。
 */

import React from "react";
import { clsx } from "clsx";

/** Input 组件属性 */
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** 前缀图标 */
  prefixIcon?: React.ReactNode;
  /** 后缀图标 */
  suffixIcon?: React.ReactNode;
  /** 错误状态 */
  error?: boolean;
  /** 输入框尺寸 */
  size?: "sm" | "md" | "lg";
}

/** 尺寸样式映射 */
const sizeStyles: Record<string, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-3 text-base",
};

/**
 * Input 输入框
 */
export const Input: React.FC<InputProps> = ({
  prefixIcon,
  suffixIcon,
  error = false,
  size = "md",
  className,
  ...props
}) => {
  return (
    <div className="relative w-full">
      {prefixIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          {prefixIcon}
        </div>
      )}
      <input
        className={clsx(
          "w-full rounded-lg border transition-colors duration-200",
          "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]",
          "placeholder:text-[var(--color-text-muted)]",
          "focus:outline-none focus:ring-2 focus:ring-claw-500/50",
          error
            ? "border-red-500 focus:border-red-500"
            : "border-[var(--color-border)] focus:border-claw-500",
          prefixIcon && "pl-10",
          suffixIcon && "pr-10",
          sizeStyles[size],
          className
        )}
        {...props}
      />
      {suffixIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          {suffixIcon}
        </div>
      )}
    </div>
  );
};
