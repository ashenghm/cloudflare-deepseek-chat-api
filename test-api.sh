#!/bin/bash

# DeepSeek Chat API 测试脚本
# 使用方法: ./test-api.sh [WORKER_URL] [DEEPSEEK_API_KEY]

# 配置
WORKER_URL=${1:-"http://localhost:8787"}
API_KEY=${2:-"your-deepseek-api-key"}

echo "🚀 Testing DeepSeek Chat API"
echo "Worker URL: $WORKER_URL"
echo "=====================================\n"

# 测试健康检查
echo "1. 测试健康检查..."
curl -X GET "$WORKER_URL/api/health" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# 测试聊天 API（非流式）
echo "2. 测试聊天 API（非流式）..."
curl -X POST "$WORKER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "你好，请简单介绍一下你自己。"
      }
    ],
    "model": "deepseek-chat",
    "max_tokens": 100,
    "temperature": 0.7
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试聊天 API（流式）
echo "3. 测试聊天 API（流式）..."
curl -X POST "$WORKER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "请写一个简单的 JavaScript 函数。"
      }
    ],
    "model": "deepseek-chat",
    "max_tokens": 200,
    "temperature": 0.7,
    "stream": true
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试错误处理
echo "4. 测试错误处理（无效请求）..."
curl -X POST "$WORKER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "invalid": "request"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试 CORS
echo "5. 测试 CORS..."
curl -X OPTIONS "$WORKER_URL/api/chat" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -i \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ 测试完成！"
