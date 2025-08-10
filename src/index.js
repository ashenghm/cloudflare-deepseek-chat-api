/**
 * Cloudflare Workers API for DeepSeek Chat Integration
 * 
 * 功能：
 * - POST /api/chat - 发送聊天消息到 DeepSeek API
 * - GET /api/health - 健康检查
 * - 支持流式响应
 * - CORS 跨域支持
 * - 错误处理和日志记录
 */

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// DeepSeek API 配置
const DEEPSEEK_API_CONFIG = {
  baseURL: 'https://api.deepseek.com/v1',
  chatEndpoint: '/chat/completions',
  defaultModel: 'deepseek-chat',
  maxTokens: 4000,
  temperature: 0.7,
};

// 错误响应工具函数
function createErrorResponse(message, status = 500) {
  return new Response(
    JSON.stringify({ 
      error: message, 
      timestamp: new Date().toISOString() 
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

// 成功响应工具函数
function createSuccessResponse(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

// 验证请求参数
function validateChatRequest(body) {
  if (!body.messages || !Array.isArray(body.messages)) {
    throw new Error('messages 字段是必需的，且必须是数组');
  }

  if (body.messages.length === 0) {
    throw new Error('messages 数组不能为空');
  }

  // 验证消息格式
  for (const message of body.messages) {
    if (!message.role || !message.content) {
      throw new Error('每个消息必须包含 role 和 content 字段');
    }
    
    if (!['system', 'user', 'assistant'].includes(message.role)) {
      throw new Error('消息角色必须是 system、user 或 assistant');
    }
  }

  return true;
}

// 调用 DeepSeek API
async function callDeepSeekAPI(messages, options = {}) {
  const apiKey = options.apiKey;
  
  if (!apiKey) {
    throw new Error('DeepSeek API key 未配置');
  }

  const requestBody = {
    model: options.model || DEEPSEEK_API_CONFIG.defaultModel,
    messages: messages,
    max_tokens: options.maxTokens || DEEPSEEK_API_CONFIG.maxTokens,
    temperature: options.temperature || DEEPSEEK_API_CONFIG.temperature,
    stream: options.stream || false,
  };

  const response = await fetch(`${DEEPSEEK_API_CONFIG.baseURL}${DEEPSEEK_API_CONFIG.chatEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`);
  }

  return response;
}

// 处理聊天请求
async function handleChatRequest(request, env) {
  try {
    const body = await request.json();
    
    // 验证请求参数
    validateChatRequest(body);

    // 获取配置参数
    const options = {
      apiKey: env.DEEPSEEK_API_KEY,
      model: body.model || env.DEFAULT_MODEL || DEEPSEEK_API_CONFIG.defaultModel,
      maxTokens: body.max_tokens || parseInt(env.MAX_TOKENS) || DEEPSEEK_API_CONFIG.maxTokens,
      temperature: body.temperature || DEEPSEEK_API_CONFIG.temperature,
      stream: body.stream || false,
    };

    // 调用 DeepSeek API
    const deepseekResponse = await callDeepSeekAPI(body.messages, options);

    // 如果是流式响应
    if (options.stream) {
      return new Response(deepseekResponse.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders,
        },
      });
    }

    // 非流式响应
    const responseData = await deepseekResponse.json();
    
    // 记录使用情况（如果需要）
    if (env.CHAT_HISTORY) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        model: options.model,
        messagesCount: body.messages.length,
        tokensUsed: responseData.usage || {},
      };
      
      const logKey = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await env.CHAT_HISTORY.put(logKey, JSON.stringify(logEntry));
    }

    return createSuccessResponse(responseData);

  } catch (error) {
    console.error('Chat request error:', error);
    return createErrorResponse(error.message, 400);
  }
}

// 健康检查
async function handleHealthCheck() {
  return createSuccessResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'DeepSeek Chat API',
    version: '1.0.0',
  });
}

// 处理 OPTIONS 请求（CORS 预检）
function handleCORSPreflight() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // 处理 CORS 预检请求
    if (method === 'OPTIONS') {
      return handleCORSPreflight();
    }

    // 路由处理
    switch (url.pathname) {
      case '/api/chat':
        if (method === 'POST') {
          return await handleChatRequest(request, env);
        }
        return createErrorResponse('Method not allowed', 405);

      case '/api/health':
        if (method === 'GET') {
          return await handleHealthCheck();
        }
        return createErrorResponse('Method not allowed', 405);

      case '/':
        return createSuccessResponse({
          message: 'DeepSeek Chat API',
          endpoints: {
            chat: 'POST /api/chat',
            health: 'GET /api/health',
          },
          documentation: 'https://github.com/ashenghm/cloudflare-deepseek-chat-api',
        });

      default:
        return createErrorResponse('Not found', 404);
    }
  },
};
