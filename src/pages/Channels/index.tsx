/**
 * Channels 渠道管理页面
 *
 * 显示可用渠道列表，支持订阅/取消订阅操作。
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getGatewayClient } from "@/lib/gateway-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Radio,
  Search,
  Users,
  Hash,
  User,
  RefreshCw,
} from "lucide-react";
import type { Channel } from "@/types";

/**
 * Channels 渠道管理页面
 */
const Channels: React.FC = () => {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  /** 加载渠道列表 */
  const loadChannels = async () => {
    setLoading(true);
    try {
      const client = getGatewayClient();
      const result = await client.call<{ channels: Channel[] }>("channel.list", {
        offset: 0,
        limit: 50,
      });
      setChannels(result.channels || []);
    } catch {
      // 使用示例数据
      setChannels([
        {
          id: "ch-1",
          name: "general",
          type: "channel",
          description: "通用讨论频道",
          member_count: 128,
          subscribed: true,
          last_active: Date.now() - 60000,
        },
        {
          id: "ch-2",
          name: "development",
          type: "channel",
          description: "开发相关讨论",
          member_count: 64,
          subscribed: true,
          last_active: Date.now() - 300000,
        },
        {
          id: "ch-3",
          name: "random",
          type: "group",
          description: "随意聊天",
          member_count: 32,
          subscribed: false,
          last_active: Date.now() - 3600000,
        },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadChannels();
  }, []);

  /** 切换订阅状态 */
  const toggleSubscribe = async (channelId: string) => {
    try {
      const client = getGatewayClient();
      const channel = channels.find((c) => c.id === channelId);
      if (channel) {
        await client.call("channel.subscribe", {
          channelId,
          subscribe: !channel.subscribed,
        });
        setChannels((prev) =>
          prev.map((c) =>
            c.id === channelId ? { ...c, subscribed: !c.subscribed } : c
          )
        );
      }
    } catch {
      // 离线时使用本地状态
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channelId ? { ...c, subscribed: !c.subscribed } : c
        )
      );
    }
  };

  /** 渠道类型图标 */
  const getChannelIcon = (type: Channel["type"]) => {
    switch (type) {
      case "channel":
        return <Hash size={16} />;
      case "group":
        return <Users size={16} />;
      case "direct":
        return <User size={16} />;
    }
  };

  /** 过滤后的渠道 */
  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Radio size={20} />
            {t("channels.title")}
          </h1>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={loadChannels}
            loading={loading}
          >
            {t("channels.refresh")}
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="mb-4">
          <Input
            prefixIcon={<Search size={16} />}
            placeholder={t("channels.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 渠道列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-claw-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Radio size={40} className="text-[var(--color-text-muted)] mb-3" />
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("channels.empty")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredChannels.map((channel) => (
              <Card key={channel.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[var(--color-text-muted)]">
                        {getChannelIcon(channel.type)}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                            {channel.name}
                          </h3>
                          <StatusBadge
                            status={channel.subscribed ? "success" : "neutral"}
                            label={channel.subscribed ? "已订阅" : "未订阅"}
                          />
                        </div>
                        {channel.description && (
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {channel.description}
                          </p>
                        )}
                        {channel.member_count && (
                          <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                            <Users size={10} />
                            {channel.member_count} 成员
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={channel.subscribed ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => toggleSubscribe(channel.id)}
                    >
                      {channel.subscribed ? t("channels.unsubscribe") : t("channels.subscribe")}
                    </Button>
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

export default Channels;
