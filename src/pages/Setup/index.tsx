/**
 * Setup 初始设置向导页面
 *
 * 首次启动时的配置向导，引导用户配置 Gateway 连接和基本设置。
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settings";
import { useGatewayStore } from "@/stores/gateway";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Server,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";

/** 向导步骤 */
type Step = "gateway" | "connect" | "complete";

/**
 * Setup 初始设置向导
 */
const Setup: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const gateway = useGatewayStore();

  const [step, setStep] = useState<Step>("gateway");
  const [port, setPort] = useState(settings.gateway_port.toString());
  const [gatewayUrl, setGatewayUrl] = useState(settings.gateway_url);
  const [connecting, setConnecting] = useState(false);

  /** 下一步 */
  const handleNext = async () => {
    if (step === "gateway") {
      // 保存 Gateway 配置
      const portNum = parseInt(port) || 18789;
      await settings.updateSettings({
        gateway_port: portNum,
        gateway_url: gatewayUrl,
      });

      // 尝试启动并连接 Gateway
      setStep("connect");
      setConnecting(true);
      try {
        await gateway.start();
        // 等待启动
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await gateway.connect();
        setStep("complete");
      } catch {
        // 连接失败，仍然允许继续
        setStep("complete");
      }
      setConnecting(false);
    } else if (step === "connect") {
      setStep("complete");
    } else if (step === "complete") {
      // 完成设置，进入主界面
      navigate("/chat", { replace: true });
    }
  };

  /** 上一步 */
  const handleBack = () => {
    if (step === "connect") setStep("gateway");
  };

  /** 跳过设置 */
  const handleSkip = () => {
    navigate("/chat", { replace: true });
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[var(--color-bg-primary)]">
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-claw-500/10 flex items-center justify-center mb-4">
            <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none">
              <path
                d="M35 30 L50 20 L65 30 L65 50 L50 60 L35 50 Z"
                fill="#22c55e"
                opacity="0.8"
              />
              <path
                d="M25 45 L35 50 L35 70 L25 65 Z"
                fill="#16a34a"
                opacity="0.6"
              />
              <path
                d="M75 45 L65 50 L65 70 L75 65 Z"
                fill="#16a34a"
                opacity="0.6"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            OpenClaw
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {t("setup.subtitle")}
          </p>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(["gateway", "connect", "complete"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  step === s
                    ? "bg-claw-600 text-white"
                    : ["gateway", "connect", "complete"].indexOf(step) >
                        ["gateway", "connect", "complete"].indexOf(s)
                      ? "bg-claw-500/20 text-claw-400"
                      : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
                }`}
              >
                {["gateway", "connect", "complete"].indexOf(step) >
                ["gateway", "connect", "complete"].indexOf(s) ? (
                  <Check size={14} />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div
                  className={`w-12 h-0.5 ${
                    ["gateway", "connect", "complete"].indexOf(step) > i
                      ? "bg-claw-500"
                      : "bg-[var(--color-border)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* 步骤内容 */}
        <Card>
          <CardContent className="p-6">
            {/* Gateway 配置 */}
            {step === "gateway" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <Server size={18} className="text-claw-400" />
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                    {t("setup.gateway_config")}
                  </h2>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t("setup.gateway_desc")}
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {t("settings.port")}
                  </label>
                  <Input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {t("settings.gateway_url")}
                  </label>
                  <Input
                    value={gatewayUrl}
                    onChange={(e) => setGatewayUrl(e.target.value)}
                    placeholder="ws://localhost:18789"
                  />
                </div>
              </div>
            )}

            {/* 连接测试 */}
            {step === "connect" && (
              <div className="flex flex-col items-center gap-4 py-4">
                {connecting ? (
                  <>
                    <Loader2 size={32} className="animate-spin text-claw-400" />
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {t("setup.connecting")}
                    </p>
                  </>
                ) : gateway.info.connected ? (
                  <>
                    <Wifi size={32} className="text-green-400" />
                    <StatusBadge status="success" label={t("setup.connected")} pulse />
                    <p className="text-sm text-[var(--color-text-secondary)] text-center">
                      {t("setup.connected_desc")}
                    </p>
                  </>
                ) : (
                  <>
                    <WifiOff size={32} className="text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {t("setup.connect_failed")}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t("setup.connect_failed_hint")}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* 完成 */}
            {step === "complete" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-12 h-12 rounded-full bg-claw-500/10 flex items-center justify-center">
                  <Check size={24} className="text-claw-400" />
                </div>
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  {t("setup.complete")}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] text-center">
                  {t("setup.complete_desc")}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border)]">
              <div>
                {step !== "gateway" && (
                  <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={handleBack}>
                    {t("setup.back")}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {step !== "complete" && (
                  <Button variant="ghost" size="sm" onClick={handleSkip}>
                    {t("setup.skip")}
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  icon={step === "complete" ? <Check size={14} /> : <ArrowRight size={14} />}
                  onClick={handleNext}
                  loading={connecting}
                >
                  {step === "complete" ? t("setup.start") : t("setup.next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Setup;
