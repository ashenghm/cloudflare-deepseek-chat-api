/**
 * Cloudflare Workers API for DeepSeek Chat Integration
 * 基于 OpenAI SDK 兼容的 DeepSeek API
 */

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// DeepSeek API 配置（OpenAI 兼容）
const DEEPSEEK_API_CONFIG = {
  baseURL: 'https://api.deepseek.com',
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

// 调用 DeepSeek API（OpenAI 兼容格式）
async function callDeepSeekAPI(messages, options = {}) {
  const apiKey = options.apiKey;
  
  if (!apiKey) {
    throw new Error('DeepSeek API key 未配置');
  }

  // 构建符合 OpenAI API 格式的请求体
  const requestBody = {
    model: options.model || DEEPSEEK_API_CONFIG.defaultModel,
    messages: messages,
    max_tokens: options.maxTokens || DEEPSEEK_API_CONFIG.maxTokens,
    temperature: options.temperature || DEEPSEEK_API_CONFIG.temperature,
    stream: options.stream || false,
  };

  // 添加可选参数
  if (options.topP !== undefined) requestBody.top_p = options.topP;
  if (options.frequencyPenalty !== undefined) requestBody.frequency_penalty = options.frequencyPenalty;
  if (options.presencePenalty !== undefined) requestBody.presence_penalty = options.presencePenalty;
  if (options.stop) requestBody.stop = options.stop;

  const response = await fetch(`${DEEPSEEK_API_CONFIG.baseURL}${DEEPSEEK_API_CONFIG.chatEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': 'Cloudflare-Workers-DeepSeek-Client/1.0.0',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `DeepSeek API 错误 (${response.status})`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      errorMessage += `: ${errorText}`;
    }
    
    throw new Error(errorMessage);
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
      topP: body.top_p,
      frequencyPenalty: body.frequency_penalty,
      presencePenalty: body.presence_penalty,
      stop: body.stop,
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
    
    // 记录使用情况到 KV（如果可用）
    if (env.CHAT_HISTORY) {
      try {
        const logEntry = {
          timestamp: new Date().toISOString(),
          model: options.model,
          messagesCount: body.messages.length,
          tokensUsed: responseData.usage || {},
          requestId: responseData.id || crypto.randomUUID(),
        };
        
        const logKey = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await env.CHAT_HISTORY.put(logKey, JSON.stringify(logEntry), {
          expirationTtl: 86400 * 30, // 30 天后过期
        });
        
        console.log('Chat history logged:', logKey);
      } catch (kvError) {
        console.error('Failed to log to KV:', kvError);
        // 不影响主要功能，继续执行
      }
    }

    return createSuccessResponse(responseData);

  } catch (error) {
    console.error('Chat request error:', error);
    return createErrorResponse(error.message, 400);
  }
}

// GraphQL Schema 定义
const typeDefs = `
  type Query {
    health: HealthStatus!
    chatHistory(limit: Int, offset: Int): [ChatLogEntry!]!
  }

  type Mutation {
    sendMessage(input: ChatInput!): ChatResponse!
  }

  type HealthStatus {
    status: String!
    timestamp: String!
    service: String!
    version: String!
  }

  type ChatResponse {
    id: String!
    object: String!
    created: Int!
    model: String!
    choices: [Choice!]!
    usage: Usage!
  }

  type Choice {
    index: Int!
    message: Message!
    finish_reason: String
  }

  type Message {
    role: String!
    content: String!
  }

  type Usage {
    prompt_tokens: Int!
    completion_tokens: Int!
    total_tokens: Int!
  }

  type ChatLogEntry {
    timestamp: String!
    model: String!
    messagesCount: Int!
    tokensUsed: Usage!
  }

  input ChatInput {
    messages: [MessageInput!]!
    model: String
    max_tokens: Int
    temperature: Float
    top_p: Float
    frequency_penalty: Float
    presence_penalty: Float
    stop: [String!]
    stream: Boolean
  }

  input MessageInput {
    role: String!
    content: String!
  }
`;

// GraphQL 解析器
const resolvers = {
  Query: {
    health: () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'DeepSeek Chat API',
      version: '1.0.0',
    }),
    chatHistory: async (_, { limit = 10, offset = 0 }, { env }) => {
      if (!env.CHAT_HISTORY) {
        return [];
      }

      try {
        const { keys } = await env.CHAT_HISTORY.list({ limit: limit + offset });
        const historyKeys = keys.slice(offset, offset + limit);
        
        const history = await Promise.all(
          historyKeys.map(async (key) => {
            const data = await env.CHAT_HISTORY.get(key.name);
            return data ? JSON.parse(data) : null;
          })
        );

        return history.filter(Boolean);
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
        return [];
      }
    },
  },
  Mutation: {
    sendMessage: async (_, { input }, { env }) => {
      try {
        // 验证输入
        validateChatRequest(input);

        const options = {
          apiKey: env.DEEPSEEK_API_KEY,
          model: input.model || env.DEFAULT_MODEL || DEEPSEEK_API_CONFIG.defaultModel,
          maxTokens: input.max_tokens || parseInt(env.MAX_TOKENS) || DEEPSEEK_API_CONFIG.maxTokens,
          temperature: input.temperature || DEEPSEEK_API_CONFIG.temperature,
          stream: false, // GraphQL 不支持流式响应
          topP: input.top_p,
          frequencyPenalty: input.frequency_penalty,
          presencePenalty: input.presence_penalty,
          stop: input.stop,
        };

        const deepseekResponse = await callDeepSeekAPI(input.messages, options);
        const responseData = await deepseekResponse.json();

        // 记录到 KV
        if (env.CHAT_HISTORY) {
          try {
            const logEntry = {
              timestamp: new Date().toISOString(),
              model: options.model,
              messagesCount: input.messages.length,
              tokensUsed: responseData.usage || {},
              requestId: responseData.id || crypto.randomUUID(),
            };
            
            const logKey = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await env.CHAT_HISTORY.put(logKey, JSON.stringify(logEntry));
          } catch (kvError) {
            console.error('Failed to log to KV:', kvError);
          }
        }

        return responseData;
      } catch (error) {
        throw new Error(error.message);
      }
    },
  },
};

// 简单的 GraphQL 执行器
async function executeGraphQL(query, variables, env) {
  // 这是一个简化的 GraphQL 执行器
  // 在生产环境中，建议使用完整的 GraphQL 库
  
  if (query.includes('mutation') && query.includes('sendMessage')) {
    return resolvers.Mutation.sendMessage(null, variables, { env });
  }
  
  if (query.includes('health')) {
    return resolvers.Query.health();
  }
  
  if (query.includes('chatHistory')) {
    return resolvers.Query.chatHistory(null, variables, { env });
  }
  
  throw new Error('Unsupported GraphQL operation');
}

// 处理 GraphQL 请求
async function handleGraphQLRequest(request, env) {
  try {
    const body = await request.json();
    const { query, variables = {} } = body;

    const result = await executeGraphQL(query, variables, env);
    
    return createSuccessResponse({ data: result });
  } catch (error) {
    console.error('GraphQL error:', error);
    return createSuccessResponse({
      data: null,
      errors: [{ message: error.message }]
    }, 400);
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

// 统计信息
async function handleStatsRequest(env) {
  if (!env.CHAT_HISTORY) {
    return createErrorResponse('KV storage not configured', 503);
  }

  try {
    const { keys } = await env.CHAT_HISTORY.list({ limit: 100 });
    
    const stats = {
      totalChats: keys.length,
      recentChats: keys.slice(0, 10).map(key => ({
        key: key.name,
        timestamp: new Date(parseInt(key.name.split('_')[1])).toISOString(),
      })),
      kvStatus: 'healthy',
    };

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(`KV error: ${error.message}`, 500);
  }
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

      case '/api/graphql':
      case '/graphql':
        if (method === 'POST') {
          return await handleGraphQLRequest(request, env);
        }
        return createErrorResponse('Method not allowed', 405);

      case '/api/health':
        if (method === 'GET') {
          return await handleHealthCheck();
        }
        return createErrorResponse('Method not allowed', 405);

      case '/api/stats':
        if (method === 'GET') {
          return await handleStatsRequest(env);
        }
        return createErrorResponse('Method not allowed', 405);

      case '/':
        return createSuccessResponse({
          message: 'DeepSeek Chat API with GraphQL Support',
          endpoints: {
            chat: 'POST /api/chat',
            graphql: 'POST /api/graphql',
            health: 'GET /api/health',
            stats: 'GET /api/stats',
          },
          documentation: 'https://github.com/ashenghm/cloudflare-deepseek-chat-api',
          graphqlSchema: typeDefs,
        });

      default:
        return createErrorResponse('Not found', 404);
    }
  },
};