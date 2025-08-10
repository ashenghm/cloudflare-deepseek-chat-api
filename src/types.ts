/**
 * TypeScript 类型定义
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ApiError {
  error: string;
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
}

export interface Environment {
  DEEPSEEK_API_KEY: string;
  DEFAULT_MODEL?: string;
  MAX_TOKENS?: string;
  ALLOWED_ORIGINS?: string;
  CHAT_HISTORY?: KVNamespace;
}

export interface ChatLogEntry {
  timestamp: string;
  model: string;
  messagesCount: number;
  tokensUsed: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}
