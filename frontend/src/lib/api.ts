/**
 * 后端 API 客户端封装
 * 统一管理所有后端接口调用
 */

// API base path. Only public, browser-safe configuration belongs in VITE_*.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

// 生成会话 ID（如果不存在则生成新的）
// 使用 sessionStorage：关闭浏览器即清除，只有浏览器打开期间能记住上下文
const SESSION_KEY = 'travel_session_id';

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// 通用请求函数
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const sessionId = getSessionId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId,
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `请求失败: ${response.status}`);
  }

  return response.json();
}

// ==============================================
// 聊天相关接口
// ==============================================

export interface ChatRequest {
  query: string;
  days?: number;
  crowd?: string;
  city?: string;
}

export interface ChatResponse {
  answer: string;
  session_id: string;
  sources?: Array<{ [key: string]: any }>;
}

export interface SmartChatRequest {
  query: string;
  city?: string;
  mode?: 'auto' | 'fast' | 'agent';
  timeout?: number;
}

export interface SmartChatResponse {
  answer: string;
  session_id: string;
  mode: 'fast' | 'agent';
  used_tools: string[];
  is_degraded: boolean;
}

/**
 * 普通聊天（带 RAG 和记忆）
 */
export async function chat(data: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==============================================
// Agent 相关接口
// ==============================================

export interface AgentRequest {
  query: string;
  city?: string;
}

export interface AgentResponse {
  output: string;
  used_tools: string[];
  intermediate_steps?: Array<{ [key: string]: any }>;
}

/**
 * Agent 智能对话（支持多工具调用）
 */
export async function agentChat(data: AgentRequest): Promise<AgentResponse> {
  return request<AgentResponse>('/chat/agent', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Smart chat with heuristic Fast/Agent routing and timeout fallback.
 */
export async function smartChat(data: SmartChatRequest): Promise<SmartChatResponse> {
  return request<SmartChatResponse>('/chat/smart', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==============================================
// 行程规划相关接口
// ==============================================

export interface PlanGenerateRequest {
  query: string;
  days: number;
  crowd?: string;
  city?: string;
  budget?: string;
}

export interface DayPlan {
  day_number: number;
  theme?: string;
  morning: string[];
  afternoon: string[];
  evening: string[];
  food_recommendations: string[];
  transportation?: string;
  tips?: string;
}

export interface TravelPlan {
  title: string;
  city: string;
  total_days: number;
  days: DayPlan[];
  summary?: string;
  budget_estimate?: string;
}

export interface EnhancedTravelPlan extends TravelPlan {
  used_tools: string[];
  is_enhanced: boolean;
}

/**
 * 生成结构化行程规划
 */
export async function generatePlan(data: PlanGenerateRequest): Promise<TravelPlan> {
  return request<TravelPlan>('/chat/plan', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Generate a structured itinerary using the backend Agent + RAG pipeline.
 */
export async function generateEnhancedPlan(data: PlanGenerateRequest): Promise<EnhancedTravelPlan> {
  return request<EnhancedTravelPlan>('/chat/plan/enhanced', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==============================================
// 会话管理
// ==============================================

/**
 * 清除会话历史
 */
export async function clearChatHistory(): Promise<{ status: string; message: string }> {
  return request('/chat/history', {
    method: 'DELETE',
  });
}

/**
 * 重置会话 ID（生成新的会话）
 */
export function resetSession(): string {
  const newSessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  sessionStorage.setItem(SESSION_KEY, newSessionId);
  return newSessionId;
}

/**
 * 获取当前会话 ID
 */
export function getCurrentSessionId(): string {
  return getSessionId();
}

// ==============================================
// 健康检查
// ==============================================

/**
 * 检查后端服务是否可用
 */
export async function healthCheck(): Promise<{ status: string }> {
  try {
    const response = await fetch('/health');
    return response.json();
  } catch {
    return { status: 'error' };
  }
}
