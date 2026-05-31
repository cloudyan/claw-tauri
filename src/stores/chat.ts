/**
 * 聊天状态管理
 *
 * 管理聊天消息、会话列表、流式传输状态和输入状态。
 */

import { create } from "zustand";
import { getGatewayClient } from "@/lib/gateway-client";
import type {
  ChatMessage,
  Session,
  MessageRole,
  ToolCall,
} from "@/types";
import type { MessageEventParams, ToolCallEvent } from "@/lib/protocol";

/** 聊天 Store 状态 */
interface ChatState {
  /** 消息列表 */
  messages: ChatMessage[];
  /** 会话列表 */
  sessions: Session[];
  /** 当前活跃会话 ID */
  activeSessionId: string | null;
  /** 是否正在发送消息 */
  sending: boolean;
  /** 是否正在加载历史消息 */
  loading: boolean;
  /** 输入框内容 */
  inputText: string;
  /** 流式传输中的消息 ID */
  streamingMessageId: string | null;

  // 操作
  /** 设置输入文本 */
  setInputText: (text: string) => void;
  /** 发送消息 */
  sendMessage: (content: string) => Promise<void>;
  /** 停止生成 */
  stopGeneration: () => void;
  /** 创建新会话 */
  createSession: () => Promise<void>;
  /** 切换会话 */
  switchSession: (sessionId: string) => void;
  /** 删除会话 */
  deleteSession: (sessionId: string) => Promise<void>;
  /** 加载会话列表 */
  loadSessions: () => Promise<void>;
  /** 加载会话消息 */
  loadMessages: (sessionId: string) => Promise<void>;
  /** 处理消息事件 */
  handleMessageEvent: (params: MessageEventParams) => void;
  /** 处理工具调用事件 */
  handleToolEvent: (params: ToolCallEvent) => void;
  /** 清空当前会话消息 */
  clearMessages: () => void;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 聊天 Store
 */
export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessions: [],
  activeSessionId: null,
  sending: false,
  loading: false,
  inputText: "",
  streamingMessageId: null,

  setInputText: (text: string) => {
    set({ inputText: text });
  },

  sendMessage: async (content: string) => {
    const { activeSessionId, messages } = get();
    if (!content.trim()) return;

    // 如果没有活跃会话，先创建一个
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = generateId();
      const newSession: Session = {
        id: sessionId,
        title: content.substring(0, 50),
        created_at: Date.now(),
        updated_at: Date.now(),
        message_count: 0,
      };
      set({
        activeSessionId: sessionId,
        sessions: [newSession, ...get().sessions],
      });
    }

    // 添加用户消息到列表
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: Date.now(),
      session_id: sessionId,
    };

    // 创建空的助手消息占位
    const assistantMessageId = generateId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      session_id: sessionId,
      streaming: true,
    };

    set({
      messages: [...messages, userMessage, assistantMessage],
      sending: true,
      streamingMessageId: assistantMessageId,
      inputText: "",
    });

    try {
      const client = getGatewayClient();
      await client.call("message.send", {
        sessionId,
        content: content.trim(),
      });
    } catch (error) {
      // 标记流式消息为错误
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `发送失败: ${(error as Error).message}`,
                streaming: false,
              }
            : msg
        ),
        sending: false,
        streamingMessageId: null,
      }));
    }
  },

  stopGeneration: () => {
    const { streamingMessageId } = get();
    if (streamingMessageId) {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === streamingMessageId
            ? { ...msg, streaming: false }
            : msg
        ),
        sending: false,
        streamingMessageId: null,
      }));
    }
  },

  createSession: async () => {
    const newSession: Session = {
      id: generateId(),
      title: "新会话",
      created_at: Date.now(),
      updated_at: Date.now(),
      message_count: 0,
    };
    set((state) => ({
      sessions: [newSession, ...state.sessions],
      activeSessionId: newSession.id,
      messages: [],
    }));
  },

  switchSession: (sessionId: string) => {
    set({ activeSessionId: sessionId, messages: [] });
    get().loadMessages(sessionId);
  },

  deleteSession: async (sessionId: string) => {
    try {
      const client = getGatewayClient();
      await client.call("session.delete", { sessionId });
    } catch {
      // 即使 RPC 调用失败，也从本地状态中移除
    }

    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== sessionId);
      const isActive = state.activeSessionId === sessionId;
      return {
        sessions: newSessions,
        activeSessionId: isActive
          ? newSessions[0]?.id || null
          : state.activeSessionId,
        messages: isActive ? [] : state.messages,
      };
    });
  },

  loadSessions: async () => {
    set({ loading: true });
    try {
      const client = getGatewayClient();
      const result = await client.call<{ sessions: Session[] }>("session.list", {
        offset: 0,
        limit: 50,
      });
      set({ sessions: result.sessions || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMessages: async (sessionId: string) => {
    set({ loading: true });
    try {
      const client = getGatewayClient();
      const result = await client.call<{ messages: ChatMessage[] }>(
        "session.messages",
        { sessionId }
      );
      set({ messages: result.messages || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  handleMessageEvent: (params: MessageEventParams) => {
    const { streamingMessageId, activeSessionId } = get();

    // 只处理当前活跃会话的消息
    if (params.sessionId !== activeSessionId) return;

    if (params.streaming && streamingMessageId) {
      // 流式传输：追加内容到当前流式消息
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === streamingMessageId
            ? { ...msg, content: msg.content + params.content }
            : msg
        ),
      }));
    } else if (params.done && streamingMessageId) {
      // 流式传输完成
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === streamingMessageId
            ? { ...msg, streaming: false }
            : msg
        ),
        sending: false,
        streamingMessageId: null,
      }));
    } else if (!params.streaming && !params.done) {
      // 完整消息（非流式）
      const newMessage: ChatMessage = {
        id: params.messageId || generateId(),
        role: params.role as MessageRole,
        content: params.content,
        timestamp: params.timestamp,
        session_id: params.sessionId,
        tool_calls: params.toolCalls?.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
          status: tc.status === "completed" ? "completed" : "pending",
          result: tc.result,
        })),
      };
      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
    }
  },

  handleToolEvent: (params: ToolCallEvent) => {
    const { streamingMessageId } = get();
    if (!streamingMessageId) return;

    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id !== streamingMessageId) return msg;

        const toolCalls = [...(msg.tool_calls || [])];
        const existingIndex = toolCalls.findIndex((tc) => tc.id === params.id);

        const toolCall: ToolCall = {
          id: params.id,
          name: params.name,
          arguments: params.arguments,
          status: params.status === "completed" ? "completed" : "running",
          result: params.result,
        };

        if (existingIndex >= 0) {
          toolCalls[existingIndex] = toolCall;
        } else {
          toolCalls.push(toolCall);
        }

        return { ...msg, tool_calls: toolCalls };
      }),
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
