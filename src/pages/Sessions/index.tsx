/**
 * Sessions 会话管理页面
 *
 * 显示所有会话列表，支持搜索、删除和切换。
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "@/stores/chat";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import {
  FolderOpen,
  Plus,
  Search,
  Trash2,
  MessageSquare,
  Clock,
} from "lucide-react";
import type { Session } from "@/types";

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString();
}

/**
 * Sessions 会话管理页面
 */
const Sessions: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessions, loadSessions, createSession, switchSession, deleteSession, loading } =
    useChatStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /** 过滤后的会话列表 */
  const filteredSessions = sessions.filter((session: Session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <FolderOpen size={20} />
            {t("sessions.title")}
          </h1>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => {
              createSession();
              navigate("/chat");
            }}
          >
            {t("sessions.new")}
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="mb-4">
          <Input
            prefixIcon={<Search size={16} />}
            placeholder={t("sessions.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 会话列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-claw-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare
              size={40}
              className="text-[var(--color-text-muted)] mb-3"
            />
            <p className="text-sm text-[var(--color-text-muted)]">
              {searchQuery
                ? t("sessions.no_results")
                : t("sessions.empty")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredSessions.map((session: Session) => (
              <Card
                key={session.id}
                clickable
                onClick={() => {
                  switchSession(session.id);
                  navigate("/chat");
                }}
              >
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {session.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {session.last_message || t("sessions.empty_session")}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                          <MessageSquare size={10} />
                          {session.message_count} {t("sessions.messages")}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                          <Clock size={10} />
                          {formatTime(session.updated_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                      title={t("sessions.delete")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;
