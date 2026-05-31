//! OpenClaw 根组件
//! 配置路由、Provider 和全局布局

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSettingsStore } from "./stores/settings";
import { useTranslation } from "react-i18next";
import "./i18n";
import MainLayout from "./components/layout/MainLayout";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Sessions from "./pages/Sessions";
import Channels from "./pages/Channels";
import Setup from "./pages/Setup";

/**
 * 应用根组件
 * 负责路由配置、主题切换和国际化初始化
 */
const App: React.FC = () => {
  const { theme } = useSettingsStore();
  useTranslation();

  // 应用主题
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      // 跟随系统
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      root.classList.toggle("light", !prefersDark);
    }
  }, [theme]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (useSettingsStore.getState().theme === "system") {
        document.documentElement.classList.toggle("dark", e.matches);
        document.documentElement.classList.toggle("light", !e.matches);
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* 初始设置向导 */}
        <Route path="/setup" element={<Setup />} />
        {/* 主布局 */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<Chat />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="channels" element={<Channels />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
