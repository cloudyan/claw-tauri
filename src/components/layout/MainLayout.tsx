/**
 * MainLayout 主布局组件
 *
 * 应用主布局，包含标题栏、侧边栏和内容区域。
 */

import React from "react";
import { Outlet } from "react-router-dom";
import TitleBar from "./TitleBar";
import Sidebar from "./Sidebar";

/**
 * MainLayout 主布局
 */
const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* 自定义标题栏 */}
      <TitleBar />
      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <aside className="w-[var(--sidebar-width)] flex-shrink-0">
          <Sidebar />
        </aside>
        {/* 内容区域 */}
        <main className="flex-1 overflow-hidden bg-[var(--color-bg-primary)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
