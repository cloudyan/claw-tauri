/**
 * Card 卡片组件
 *
 * 提供卡片容器及其子组件（Header、Content、Footer）。
 */

import React from "react";
import { clsx } from "clsx";

/** Card 容器属性 */
interface CardProps {
  className?: string;
  children: React.ReactNode;
  /** 是否可点击 */
  clickable?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

/** CardHeader 属性 */
interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

/** CardContent 属性 */
interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

/** CardFooter 属性 */
interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Card 卡片容器
 */
export const Card: React.FC<CardProps> = ({
  className,
  children,
  clickable = false,
  onClick,
}) => {
  return (
    <div
      className={clsx(
        "bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl",
        clickable && "cursor-pointer hover:border-[var(--color-border-light)] transition-colors",
        className
      )}
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </div>
  );
};

/**
 * CardHeader 卡片头部
 */
export const CardHeader: React.FC<CardHeaderProps> = ({
  className,
  children,
}) => {
  return (
    <div
      className={clsx(
        "px-4 py-3 border-b border-[var(--color-border)]",
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * CardContent 卡片内容
 */
export const CardContent: React.FC<CardContentProps> = ({
  className,
  children,
}) => {
  return <div className={clsx("px-4 py-3", className)}>{children}</div>;
};

/**
 * CardFooter 卡片底部
 */
export const CardFooter: React.FC<CardFooterProps> = ({
  className,
  children,
}) => {
  return (
    <div
      className={clsx(
        "px-4 py-3 border-t border-[var(--color-border)]",
        className
      )}
    >
      {children}
    </div>
  );
};
