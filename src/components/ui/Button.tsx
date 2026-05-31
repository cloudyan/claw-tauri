/**
 * Button 按钮组件
 *
 * 支持 primary、secondary、ghost、danger 四种变体和多种尺寸。
 */

import React from "react";
import { clsx } from "clsx";

/** Button 组件属性 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** 按钮尺寸 */
  size?: "sm" | "md" | "lg";
  /** 是否加载中 */
  loading?: boolean;
  /** 左侧图标 */
  icon?: React.ReactNode;
}

/** 变体样式映射 */
const variantStyles: Record<string, string> = {
  primary:
    "bg-claw-600 text-white hover:bg-claw-700 focus:ring-claw-500 active:bg-claw-800",
  secondary:
    "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] focus:ring-[var(--color-border-light)]",
  ghost:
    "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] focus:ring-[var(--color-border-light)]",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800",
};

/** 尺寸样式映射 */
const sizeStyles: Record<string, string> = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2.5",
};

/**
 * Button 按钮
 */
export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-lg font-medium",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
