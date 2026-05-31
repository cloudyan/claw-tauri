/**
 * Settings 设置页面
 *
 * 应用设置页面，包含 Gateway 配置、外观设置和通知设置。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settings";
import { useGatewayStore } from "@/stores/gateway";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Settings as SettingsIcon,
  Palette,
  Bell,
  Server,
  RotateCcw,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";

/**
 * Settings 设置页面
 */
const Settings: React.FC = () => {
  const { t } = useTranslation();
  const settings = useSettingsStore();
  const gateway = useGatewayStore();

  /** Gateway 状态映射 */
  const statusMap: Record<string, { type: "success" | "warning" | "error" | "neutral"; label: string }> = {
    running: { type: "success", label: "运行中" },
    starting: { type: "warning", label: "启动中" },
    stopping: { type: "warning", label: "停止中" },
    stopped: { type: "neutral", label: "已停止" },
    error: { type: "error", label: "错误" },
  };

  const gwStatus = statusMap[gateway.info.status] || statusMap.stopped;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
          <SettingsIcon size={20} />
          {t("settings.title")}
        </h1>

        {/* Gateway 设置 */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-[var(--color-text-muted)]" />
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {t("settings.gateway")}
                </h2>
              </div>
              <StatusBadge status={gwStatus.type} label={gwStatus.label} pulse={gateway.info.status === "running"} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Gateway 端口 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                {t("settings.port")}
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={settings.gateway_port.toString()}
                  onChange={(e) =>
                    settings.setGatewayPort(parseInt(e.target.value) || 18789)
                  }
                  className="flex-1"
                />
              </div>
            </div>

            {/* Gateway URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                {t("settings.gateway_url")}
              </label>
              <Input
                value={settings.gateway_url}
                onChange={(e) => settings.setGatewayUrl(e.target.value)}
                placeholder="ws://localhost:18789"
              />
            </div>

            {/* 自动启动 */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_start_gateway}
                onChange={(e) =>
                  settings.updateSettings({ auto_start_gateway: e.target.checked })
                }
                className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-primary)] text-claw-600 focus:ring-claw-500"
              />
              <span className="text-sm text-[var(--color-text-primary)]">
                {t("settings.auto_start")}
              </span>
            </label>

            {/* Gateway 控制按钮 */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Play size={14} />}
                onClick={gateway.start}
                loading={gateway.loading && gateway.info.status !== "running"}
                disabled={gateway.info.status === "running"}
              >
                {t("settings.start")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Square size={14} />}
                onClick={gateway.stop}
                disabled={gateway.info.status === "stopped"}
              >
                {t("settings.stop")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={14} />}
                onClick={gateway.restart}
                loading={gateway.loading}
              >
                {t("settings.restart")}
              </Button>
            </div>

            {/* 错误提示 */}
            {gateway.error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {gateway.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 外观设置 */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-[var(--color-text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {t("settings.appearance")}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* 主题选择 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                {t("settings.theme")}
              </label>
              <div className="flex gap-2">
                {(["dark", "light", "system"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => settings.setTheme(theme)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      settings.theme === theme
                        ? "bg-claw-500/10 border-claw-500/30 text-claw-400"
                        : "bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-light)]"
                    }`}
                  >
                    {t(`settings.theme_${theme}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 语言选择 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                {t("settings.language")}
              </label>
              <div className="flex gap-2">
                {(["zh", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => settings.setLanguage(lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      settings.language === lang
                        ? "bg-claw-500/10 border-claw-500/30 text-claw-400"
                        : "bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-light)]"
                    }`}
                  >
                    {lang === "zh" ? "中文" : "English"}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 通知设置 */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[var(--color-text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {t("settings.notifications")}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications_enabled}
                onChange={(e) =>
                  settings.updateSettings({ notifications_enabled: e.target.checked })
                }
                className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-primary)] text-claw-600 focus:ring-claw-500"
              />
              <span className="text-sm text-[var(--color-text-primary)]">
                {t("settings.enable_notifications")}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.minimize_to_tray}
                onChange={(e) =>
                  settings.updateSettings({ minimize_to_tray: e.target.checked })
                }
                className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-primary)] text-claw-600 focus:ring-claw-500"
              />
              <span className="text-sm text-[var(--color-text-primary)]">
                {t("settings.minimize_to_tray")}
              </span>
            </label>
          </CardContent>
        </Card>

        {/* 重置设置 */}
        <div className="flex justify-end pt-2 pb-8">
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => {
              settings.updateSettings({
                gateway_port: 18789,
                gateway_url: "ws://localhost:18789",
                auto_start_gateway: true,
                theme: "dark",
                language: "zh",
                notifications_enabled: true,
                minimize_to_tray: true,
                start_minimized: false,
              });
            }}
          >
            {t("settings.reset")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
