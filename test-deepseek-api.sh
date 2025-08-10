#!/bin/bash

# DeepSeek Chat API 测试脚本 - 基于 OpenAI SDK 兼容格式
# 使用方法: ./test-deepseek-api.sh [WORKER_URL] [DEEPSEEK_API_KEY]

# 配置
WORKER_URL=${1:-"http://localhost:8787"}
API_KEY=${2:-"your-deepseek-api-key"}

echo "🚀 Testing DeepSeek Chat API (OpenAI Compatible)"
echo "Worker URL: $WORKER_URL"
echo "=====================================\n"

# 测试健康检查
echo "1. 测试健康检查..."
curl -X GET "$WORKER_URL/api/health" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# 测试直接 Chat API（非流式，OpenAI 格式）
echo "2. 测试 Chat API（OpenAI 兼容格式）..."
curl -X POST "$WORKER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "请用中文简单介绍一下 DeepSeek AI。"
      }
    ],
    "max_tokens": 150,
    "temperature": 0.7,
    "top_p": 0.95
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试 GraphQL 健康查询
echo "3. 测试 GraphQL 健康查询..."
curl -X POST "$WORKER_URL/api/graphql" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { health { status timestamp service version } }"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试 GraphQL 发送消息
echo "4. 测试 GraphQL 发送消息..."
curl -X POST "$WORKER_URL/api/graphql" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation SendMessage($input: ChatInput!) { sendMessage(input: $input) { id object created model choices { index message { role content } finish_reason } usage { prompt_tokens completion_tokens total_tokens } } }",
    "variables": {
      "input": {
        "messages": [
          {
            "role": "system",
            "content": "You are a helpful assistant."
          },
          {
            "role": "user",
            "content": "解释一下什么是人工智能。"
          }
        ],
        "model": "deepseek-chat",
        "max_tokens": 200,
        "temperature": 0.7
      }
    }
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试流式响应
echo "5. 测试流式响应..."
curl -X POST "$WORKER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {
        "role": "user",
        "content": "写一个简单的 Python Hello World 程序。"
      }
    ],
    "max_tokens": 100,
    "temperature": 0.3,
    "stream": true
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试错误处理（无效请求）
echo "6. 测试错误处理（无效请求）..."
curl -X POST "$WORKER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "invalid": "request"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试 CORS
echo "7. 测试 CORS..."
curl -X OPTIONS "$WORKER_URL/api/chat" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -i \
  -w "\nStatus: %{http_code}\n\n"

# 测试统计信息
echo "8. 测试统计信息..."
curl -X GET "$WORKER_URL/api/stats" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# 测试 GraphQL 聊天历史（如果可用）
echo "9. 测试 GraphQL 聊天历史..."
curl -X POST "$WORKER_URL/api/graphql" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetChatHistory($limit: Int) { chatHistory(limit: $limit) { timestamp model messagesCount tokensUsed { prompt_tokens completion_tokens total_tokens } } }",
    "variables": {
      "limit": 5
    }
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ 测试完成！"