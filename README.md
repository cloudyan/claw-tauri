# OpenClaw Desktop

> 基于 Tauri 2.x + React 19 的 OpenClaw 桌面客户端

OpenClaw Desktop 是 OpenClaw 生态的官方桌面端，将 [OpenClaw Gateway](https://github.com/openclaw-ecosystem) 作为 sidecar 进程嵌入，提供原生体验的 AI 对话、会话管理与渠道订阅能力。

## ✨ 特性

- 🚀 **原生性能** — Tauri 2.x，包体积小、内存占用低
- 🔌 **Gateway 自管理** — 内置 Gateway 进程的启动 / 停止 / 健康检查 / 熔断重启
- 🌐 **双向通信** — 基于 WebSocket JSON-RPC 2.0 协议
- 🎨 **现代 UI** — React 19 + TailwindCSS + Lucide Icons
- 🌓 **主题切换** — Dark / Light / 跟随系统
- 🌍 **国际化** — 中英双语（i18next）
- 🖥️ **系统集成** — 托盘菜单、系统通知（macOS 已支持）
- 💬 **完整能力** — Chat / Sessions / Channels / Settings 一站式

## 🧱 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 19, React Router 7, TypeScript 5.6 |
| 构建工具 | Vite 6 |
| 状态管理 | Zustand 5 |
| UI / 样式 | TailwindCSS 3, clsx, tailwind-merge, lucide-react |
| 国际化 | i18next, react-i18next |
| 桌面端 | Tauri 2.x (Rust) |
| Rust 后端 | tokio, tokio-tungstenite, reqwest, parking_lot, serde |

## 📁 项目结构

```
openclaw-tauri/
├── src/                        # 前端 (React + TS)
│   ├── App.tsx                 # 路由与主题
│   ├── pages/                  # 页面：Chat / Sessions / Channels / Settings / Setup
│   ├── components/
│   │   ├── layout/             # 主布局
│   │   └── ui/                 # 基础组件 (Button / Card / Dialog / ...)
│   ├── stores/                 # Zustand: settings / gateway / chat
│   ├── hooks/                  # useGateway / useChat
│   ├── lib/
│   │   ├── tauri-commands.ts   # Tauri Command 类型安全封装
│   │   ├── protocol.ts         # JSON-RPC 协议类型
│   │   └── gateway-client.ts   # WebSocket 客户端
│   └── i18n/                   # 中英文
│
├── src-tauri/                  # Rust 后端
│   ├── src/
│   │   ├── lib.rs              # 应用入口
│   │   ├── state.rs            # 全局状态 / 设置 / 错误类型
│   │   ├── gateway/
│   │   │   ├── manager.rs      # Gateway 进程管理 (健康检查 + 熔断器)
│   │   │   └── connection.rs   # WebSocket 客户端
│   │   ├── commands/           # gateway / settings / system 命令
│   │   └── tray.rs             # 系统托盘 (macOS)
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 18
- **pnpm** ≥ 8（项目强制使用 pnpm）
- **Rust** ≥ 1.77（建议通过 [rustup](https://rustup.rs/) 安装）
- 各平台 Tauri 构建依赖：参见 [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### 安装依赖

```bash
pnpm install
```

### 开发模式

启动桌面端（自动拉起 Vite 与 Tauri 窗口）：

```bash
pnpm tauri:dev
```

仅启动前端（浏览器调试，不含 Tauri Command）：

```bash
pnpm dev    # http://localhost:1420
```

### 构建发布

```bash
# 仅前端产物 → dist/
pnpm build

# 打包桌面安装包 → src-tauri/target/release/bundle/
pnpm tauri:build
```

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────┐
│  React 前端 (src/)                                  │
│  ├─ Pages / Components                              │
│  ├─ Zustand Stores                                  │
│  └─ tauri-commands.ts ────┐                         │
└───────────────────────────┼─────────────────────────┘
                            │ invoke()
┌───────────────────────────▼─────────────────────────┐
│  Rust 后端 (src-tauri/src/)                         │
│  ├─ commands/  (start_gateway, get_settings, ...)   │
│  ├─ GatewayManager  ──spawn──▶ Gateway 子进程       │
│  └─ GatewayConnection ──WS JSON-RPC──▶ Gateway      │
└─────────────────────────────────────────────────────┘
```

- **前端** 通过类型安全的 `invoke()` 调用 Rust 命令
- **Rust 后端** 负责 Gateway 子进程生命周期、状态持久化、系统托盘
- **Gateway 通信** 使用 WebSocket JSON-RPC 2.0，含握手协议（challenge / connect / hello-ok）
- **熔断机制**：连续 5 次健康检查失败后冷却 60 秒，避免无限重启

详细架构说明见 [CLAUDE.md](./CLAUDE.md)。

## ⚙️ 默认配置

| 项 | 默认值 |
|---|---|
| Gateway 端口 | `18789` |
| Gateway URL | `ws://localhost:18789` |
| 主题 | `dark` |
| 语言 | `zh` |
| 自动启动 Gateway | `true` |
| 最小化到托盘 | `true` |

可通过应用内 **Settings** 页面修改。

## 🔧 常用命令一览

```bash
pnpm dev          # Vite 前端开发服务
pnpm build        # tsc + vite build
pnpm preview      # 预览构建产物
pnpm tauri:dev    # 桌面端开发
pnpm tauri:build  # 桌面端打包

# Rust 端
cd src-tauri
cargo check
cargo build
cargo test
```

## 🔗 可参考项目

### 上游 / 生态核心

| 项目 | 技术栈 | 简介 |
|---|---|---|
| [openclaw/openclaw](https://github.com/openclaw/openclaw) ⭐375k | TypeScript | **OpenClaw 主项目** —— Your own personal AI assistant. Any OS. Any Platform. The lobster way. 🦞 |
| [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) ⭐173k | Python | Hermes Agent —— 与 OpenClaw 互通的 Agent 框架，可成长型 Agent |
| [farion1231/cc-switch](https://github.com/farion1231/cc-switch) ⭐85k | Rust | 跨平台桌面端 All-in-One 助手，支持 Claude Code、Codex、OpenCode、OpenClaw、Gemini CLI、Hermes Agent |
| [VoltAgent/awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills) ⭐49k | — | OpenClaw 官方 Skills Registry 精选合集，5400+ 技能分类整理 🦞 |

### 同类桌面端 / Cowork GUI（按热度排序）

| 项目 | 技术栈 | 简介 |
|---|---|---|
| [iOfficeAI/AionUi](https://github.com/iOfficeAI/AionUi) ⭐27k | Electron / TS | 24/7 Cowork 桌面应用，支持 OpenClaw、Hermes、Claude Code、Codex、OpenCode、Gemini CLI 等 20+ CLI 聚合 |
| [op7418/CodePilot](https://github.com/op7418/CodePilot) ⭐5.8k | Electron + Next.js | 多模型 AI Agent 桌面端，支持任意 Provider、MCP / Skills 扩展，可手机端控制 |
| [OpenCoworkAI/open-cowork](https://github.com/OpenCoworkAI/open-cowork) ⭐1.4k | Electron / TS | 开源 Cowork 桌面应用，一键安装 Claude Code、MCP、Skills，沙箱隔离、多模型、飞书 / Slack 集成 |
| [TesslateAI/OpenSail](https://github.com/TesslateAI/OpenSail) ⭐560 | Python | Codex App / Claude Desktop / Cursor / Cowork 的开源替代，面向 Agentic 软件开发 |
| [AFK-surf/OpenBridge](https://github.com/AFK-surf/OpenBridge) ⭐398 | Swift | 原生 macOS，Claude Cowork / Codex 的替代品，定位「意图到执行」的安全 Agent 桥梁 |
| [CoWork-OS/CoWork-OS](https://github.com/CoWork-OS/CoWork-OS) ⭐335 | TypeScript | Local-first 个人 Agentic OS，涵盖编码、知识管理、Web 设计、自动化、Artifacts |
| [ttnear/Clarc](https://github.com/ttnear/Clarc) ⭐278 | Swift / SwiftUI | 原生 macOS Claude Code GUI 客户端 |
| [laborany/laborany](https://github.com/laborany/laborany) ⭐66 | TypeScript | 基于 Claude Code 的桌面 AI 工作力平台，**OpenClaw 桌面实现**，支持飞书 / QQ 远程调度、定时任务 🦞 |
| [yaakua/cc-copilot.com](https://github.com/yaakua/cc-copilot.com) ⭐55 | TypeScript | `@anthropic-ai/claude-code` 的开源桌面 GUI，多 Provider 切换 + 用量追踪 |
| [Glsme/agent-monitor](https://github.com/Glsme/agent-monitor) ⭐52 | **Tauri 2 + React** | Claude Code Agent 团队 GUI 监控（像素风办公室视图），技术栈与本项目最接近 |

> **本项目差异化定位**：OpenClaw Tauri 强调 **Gateway sidecar 内置 + JSON-RPC 协议契约 + Tauri 原生轻量**，将 Gateway 进程的生命周期与健康熔断收敛在 Rust 后端，前端只通过协议层通信。

## 🗺️ Roadmap

- [ ] Windows / Linux 系统托盘适配
- [ ] 自动更新（tauri-plugin-updater）
- [ ] 端到端测试与单元测试
- [ ] ESLint + Prettier 工程化
- [ ] CI/CD（多平台构建）

## 🤝 贡献

欢迎提交 Issue 与 PR。提交前请确保：

1. 代码通过 `pnpm build`（含 TS 类型检查）
2. Rust 代码通过 `cargo check`
3. 遵循项目中文注释与文档约定

## 📄 License

ISC
