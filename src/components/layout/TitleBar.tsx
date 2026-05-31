/**
 * TitleBar 自定义标题栏组件
 *
 * 实现跨平台的窗口控制栏（macOS 红绿灯按钮 / Windows 最小化最大化关闭）。
 */

import React from "react";

/** 检测是否在 Tauri 环境中 */
const isTauri = "__TAURI_INTERNALS__" in window;

/**
 * TitleBar 自定义标题栏
 */
const TitleBar: React.FC = () => {
  /** 最小化窗口 */
  const handleMinimize = async () => {
    if (!isTauri) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  };

  /** 最大化/还原窗口 */
  const handleMaximize = async () => {
    if (!isTauri) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  };

  /** 关闭窗口 */
  const handleClose = async () => {
    if (!isTauri) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  };

  return (
    <div
      className="flex items-center justify-between h-[var(--titlebar-height)] px-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] drag-region select-none"
      data-tauri-drag-region
    >
      {/* 左侧：窗口标题 */}
      <div className="flex items-center gap-2 no-drag" data-tauri-drag-region>
        <img
          src="/assets/logo.svg"
          alt="OpenClaw"
          className="w-4 h-4"
        />
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          OpenClaw
        </span>
      </div>

      {/* 右侧：窗口控制按钮 */}
      <div className="flex items-center no-drag">
        {/* macOS 风格控制按钮 */}
        <button
          onClick={handleClose}
          className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors mr-1.5"
          title="关闭"
        />
        <button
          onClick={handleMinimize}
          className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#f5a623] transition-colors mr-1.5"
          title="最小化"
        />
        <button
          onClick={handleMaximize}
          className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#1db954] transition-colors"
          title="最大化"
        />
      </div>
    </div>
  );
};

export default TitleBar;
