/**
 * Sidebar 侧边栏导航组件
 *
 * 提供应用主导航，包含会话列表、渠道管理和设置入口。
 */

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import {
  MessageSquare,
  Settings,
  FolderOpen,
  Radio,
  Plus,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { useGatewayStore } from "@/stores/gateway";
import { useChatStore } from "@/stores/chat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Session } from "@/types";

/**
 * Sidebar 侧边栏
 */
const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { connectionState } = useGatewayStore();
  const { sessions, activeSessionId, createSession, switchSession } =
    useChatStore();

  /** 导航项配置 */
  const navItems = [
    { path: "/chat", icon: MessageSquare, label: t("nav.chat") },
    { path: "/sessions", icon: FolderOpen, label: t("nav.sessions") },
    { path: "/channels", icon: Radio, label: t("nav.channels") },
    { path: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  /** Gateway 连接状态 */
  const gatewayStatusType =
    connectionState === "connected"
      ? "success"
      : connectionState === "connecting"
        ? "warning"
        : connectionState === "error"
          ? "error"
          : "neutral";

  const gatewayStatusLabel =
    connectionState === "connected"
      ? t("status.connected")
      : connectionState === "connecting"
        ? t("status.connecting")
        : connectionState === "error"
          ? t("status.error")
          : t("status.disconnected");

  /** 格式化时间 */
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t("time.just_now");
    if (diffMins < 60) return `${diffMins}${t("time.minutes_ago")}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}${t("time.hours_ago")}`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]">
      {/* Gateway 状态指示 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
        {connectionState === "connecting" ? (
          <Loader2 size={14} className="animate-spin text-yellow-400" />
        ) : connectionState === "connected" ? (
          <Wifi size={14} className="text-green-400" />
        ) : (
          <WifiOff size={14} className="text-[var(--color-text-muted)]" />
        )}
        <StatusBadge status={gatewayStatusType} label={gatewayStatusLabel} />
      </div>

      {/* 导航菜单 */}
      <nav className="flex flex-col gap-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-claw-500/10 text-claw-400"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            {t("sidebar.sessions")}
          </span>
          <button
            onClick={createSession}
            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-claw-400 hover:bg-[var(--color-bg-tertiary)] transition-colors"
            title={t("sidebar.new_session")}
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-0.5 px-2">
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">
              {t("sidebar.no_sessions")}
            </div>
          ) : (
            sessions.map((session: Session) => (
              <button
                key={session.id}
                onClick={() => switchSession(session.id)}
                className={clsx(
                  "flex flex-col items-start gap-1 px-3 py-2 rounded-lg text-left transition-colors w-full",
                  session.id === activeSessionId
                    ? "bg-claw-500/10"
                    : "hover:bg-[var(--color-bg-tertiary)]"
                )}
              >
                <span className="text-sm text-[var(--color-text-primary)] truncate w-full">
                  {session.title}
                </span>
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-[var(--color-text-muted)] truncate">
                    {session.last_message || t("sidebar.empty_session")}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)] ml-auto flex-shrink-0">
                    {formatTime(session.updated_at)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
