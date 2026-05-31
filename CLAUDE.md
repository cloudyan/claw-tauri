# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

OpenClaw Desktop Client，基于 **Tauri 2.x + React 19 + TypeScript + Vite 6** 的桌面客户端。前端 (React) 通过 Tauri Command 调用 Rust 后端，Rust 后端负责管理 OpenClaw Gateway（作为 sidecar 子进程），并通过 WebSocket (JSON-RPC) 与 Gateway 通信。

## 常用命令

依赖管理统一使用 **pnpm**。

```bash
# 安装依赖
pnpm install

# 仅前端开发（Vite dev server，默认 http://localhost:1420）
pnpm dev

# 仅前端构建（tsc + vite build → dist/）
pnpm build

# 桌面端开发（启动 Tauri，自动拉起 pnpm dev）
pnpm tauri:dev

# 桌面端打包（自动执行 pnpm build → 生成安装包）
pnpm tauri:build

# Rust 端单独操作（在 src-tauri/ 下）
cd src-tauri && cargo check
cd src-tauri && cargo build
cd src-tauri && cargo test <test_name>
```

注意：项目 **没有配置** 测试框架（无 vitest/jest）和 Lint 工具（无 eslint），TypeScript 类型检查通过 `pnpm build` 中的 `tsc` 完成。

## 架构总览

### 双层架构：前端 React + 后端 Rust

```
React (src/)  ──invoke──▶  Rust (src-tauri/src/)  ──spawn──▶  Gateway 子进程
                                     │
                                     └──WebSocket (JSON-RPC)──▶  Gateway
```

- **前端**：UI、路由、状态（Zustand）、i18n、调用 Tauri Command
- **Rust 后端**：进程生命周期管理、WebSocket 连接、设置持久化、系统托盘
- **Gateway**：独立的 OpenClaw Gateway 进程，作为 sidecar 由 Rust 后端管理

### Rust 后端关键模块（src-tauri/src/）

- `lib.rs` — 应用入口 `run()`：注册 Tauri 插件、注册命令、初始化 `AppState`、setup 托盘
- `state.rs` — 全局状态 `AppState`（含 `GatewayManager`、`GatewayConnection`、`AppSettings`），错误类型 `AppError`
- `gateway/manager.rs` — Gateway 进程生命周期：启动/停止/重启 + 健康检查（HTTP ping）+ **熔断器机制**（连续失败 5 次后冷却 60 秒）
- `gateway/connection.rs` — WebSocket 客户端，处理 JSON-RPC 握手 (`hello`)
- `commands/` — 暴露给前端的 Tauri Command：`gateway.rs`（start/stop/restart/connect/disconnect/status）、`settings.rs`、`system.rs`
- `tray.rs` — 系统托盘（仅 macOS，`#[cfg(target_os = "macos")]`）

修改命令后需同步 `lib.rs` 中的 `invoke_handler!` 数组与前端 `src/lib/tauri-commands.ts`。

### 前端关键目录（src/）

- `App.tsx` — 路由 (`react-router-dom v7`)、主题应用（dark/light/system 同步 `<html class>`)
- `pages/` — 路由页面：`Chat / Sessions / Channels / Settings / Setup`（初始化向导）
- `components/layout/MainLayout.tsx` — 主布局壳；`components/ui/` — 基础组件（Button/Card/Dialog/Input/StatusBadge）
- `stores/` — Zustand 状态：`settings.ts`（主题/语言/Gateway 配置）、`gateway.ts`（连接状态）、`chat.ts`（会话/消息）
- `lib/tauri-commands.ts` — 类型安全封装 `invoke()` 调用，按 `gatewayCommands / settingsCommands / systemCommands` 分组
- `lib/protocol.ts` — OpenClaw Gateway WebSocket **JSON-RPC 协议类型**（RequestFrame / ResponseFrame / EventFrame / 各业务参数）
- `lib/gateway-client.ts` — 前端 WebSocket 客户端（与 Rust 后端的连接管理并存，前端可直连 Gateway）
- `hooks/useGateway.ts / useChat.ts` — 业务 Hook
- `i18n/` — `i18next` + 中英文 (`zh.json / en.json`)，默认中文

### Tauri 配置要点（src-tauri/tauri.conf.json）

- `productName: OpenClaw`，identifier `com.openclaw.desktop`
- `beforeDevCommand: pnpm dev`，devUrl `http://localhost:1420`（与 vite.config.ts 一致，**strictPort**）
- `frontendDist: ../dist`
- 窗口 `decorations: false`（无原生标题栏 → 需要自定义拖拽区域）
- 启用 `tray-icon` feature；托盘逻辑仅在 macOS 编译

### Gateway 通信约定

- 默认端口 **18789**，URL `ws://localhost:18789`
- 协议为 **JSON-RPC 2.0** over WebSocket（详见 `src/lib/protocol.ts`）
- 握手流程：服务端发 `challenge` → 客户端 `connect` → 服务端 `hello-ok`
- 事件帧无 `id`（如 `message.delta`、`session.created`、`tool.started`）

### 路径别名

Vite 配置 `@` → `./src`，前端 import 一律使用 `@/...`。

## 项目约定（来自全局配置）

- 所有对话/文档/注释使用中文
- 前端依赖优先 **pnpm**（已锁定 `pnpm-lock.yaml`）
- 文档使用 Markdown

## 已知缺失

- 无 README.md、无测试、无 ESLint/Prettier 配置
- Windows/Linux 托盘未实现（`tray.rs` 仅 macOS）
