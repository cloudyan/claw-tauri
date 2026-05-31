/**
 * 应用设置状态管理
 *
 * 管理应用设置，包括主题、语言、Gateway URL 等。
 * 使用 Zustand persist 中间件实现持久化。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { settingsCommands } from "@/lib/tauri-commands";
import type { AppSettings } from "@/types";

/** 设置 Store 状态 */
interface SettingsState extends AppSettings {
  /** 是否已初始化 */
  initialized: boolean;
  /** 是否正在加载 */
  loading: boolean;

  // 操作
  /** 加载设置（从 Tauri Store） */
  loadSettings: () => Promise<void>;
  /** 更新所有设置 */
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  /** 设置主题 */
  setTheme: (theme: "dark" | "light" | "system") => Promise<void>;
  /** 设置语言 */
  setLanguage: (language: "zh" | "en") => Promise<void>;
  /** 设置 Gateway 端口 */
  setGatewayPort: (port: number) => Promise<void>;
  /** 设置 Gateway URL */
  setGatewayUrl: (url: string) => Promise<void>;
}

/** 默认设置 */
const defaultSettings: AppSettings = {
  gateway_port: 18789,
  gateway_url: "ws://localhost:18789",
  auto_start_gateway: true,
  theme: "dark",
  language: "zh",
  notifications_enabled: true,
  minimize_to_tray: true,
  start_minimized: false,
  extra: {},
};

/**
 * 设置 Store（带持久化）
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      initialized: false,
      loading: false,

      loadSettings: async () => {
        set({ loading: true });
        try {
          const settings = await settingsCommands.getAll();
          set({ ...settings, initialized: true, loading: false });
        } catch {
          // 使用默认设置
          set({ initialized: true, loading: false });
        }
      },

      updateSettings: async (partial: Partial<AppSettings>) => {
        const current = get();
        const updated = { ...current, ...partial };
        set(updated);
        try {
          await settingsCommands.setAll(updated as AppSettings);
        } catch (error) {
          console.error("保存设置失败:", error);
        }
      },

      setTheme: async (theme: "dark" | "light" | "system") => {
        await get().updateSettings({ theme });
      },

      setLanguage: async (language: "zh" | "en") => {
        await get().updateSettings({ language });
      },

      setGatewayPort: async (port: number) => {
        const gatewayUrl = `ws://localhost:${port}`;
        await get().updateSettings({ gateway_port: port, gateway_url: gatewayUrl });
      },

      setGatewayUrl: async (url: string) => {
        await get().updateSettings({ gateway_url: url });
      },
    }),
    {
      name: "openclaw-settings",
      // 只持久化特定字段
      partialize: (state) => ({
        gateway_port: state.gateway_port,
        gateway_url: state.gateway_url,
        auto_start_gateway: state.auto_start_gateway,
        theme: state.theme,
        language: state.language,
        notifications_enabled: state.notifications_enabled,
        minimize_to_tray: state.minimize_to_tray,
        start_minimized: state.start_minimized,
      }),
    }
  )
);
