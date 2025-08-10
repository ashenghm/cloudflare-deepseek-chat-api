# Cloudflare Workers DeepSeek Chat API

一个基于 Cloudflare Workers 的 DeepSeek API 代理服务，提供聊天功能、流式响应、CORS 支持和错误处理。

## 🚀 功能特性

- **🤖 DeepSeek API 集成** - 完整支持 DeepSeek 聊天 API
- **🌊 流式响应** - 支持实时流式输出
- **🔒 安全性** - API Key 安全管理，支持访问控制
- **🌐 CORS 支持** - 完整的跨域资源共享支持
- **📊 日志记录** - 可选的聊天历史记录存储
- **⚡ 高性能** - 基于 Cloudflare Workers 边缘计算
- **🛠️ 易于部署** - 一键部署到全球 CDN

## 📋 API 端点

### `POST /api/chat`
发送聊天消息到 DeepSeek API

**请求体:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "你好，请介绍一下你自己"
    }
  ],
  "model": "deepseek-chat",
  "max_tokens": 1000,
  "temperature": 0.7,
  "stream": false
}
```

**响应:**
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！我是 DeepSeek..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 100,
    "total_tokens": 115
  }
}
```

### `GET /api/health`
健康检查端点

**响应:**
```json
{
  "status": "healthy",
  "timestamp": "2024-10-25T10:00:00.000Z",
  "service": "DeepSeek Chat API",
  "version": "1.0.0"
}
```

## 🛠️ 快速开始

### 1. 克隆仓库
```bash
git clone https://github.com/ashenghm/cloudflare-deepseek-chat-api.git
cd cloudflare-deepseek-chat-api
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 DeepSeek API Key
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. 本地开发
```bash
# 启动开发服务器
npm run dev

# 服务将在 http://localhost:8787 运行
```

### 5. 测试 API
```bash
# 使用测试脚本
chmod +x test-api.sh
./test-api.sh http://localhost:8787 your-deepseek-api-key

# 或者打开 demo.html 进行可视化测试
```

## 🚀 部署到 Cloudflare Workers

### 方法一：使用 Wrangler CLI

1. **安装 Wrangler**
```bash
npm install -g wrangler
```

2. **登录 Cloudflare**
```bash
wrangler login
```

3. **配置 wrangler.toml**
```toml
name = "your-worker-name"
main = "src/index.js"
compatibility_date = "2024-10-25"
```

4. **设置环境变量**
```bash
# 设置 DeepSeek API Key
wrangler secret put DEEPSEEK_API_KEY

# 设置其他可选变量
wrangler secret put ALLOWED_ORIGINS
```

5. **部署**
```bash
npm run deploy
```

### 方法二：使用 GitHub Actions

1. **在 GitHub 仓库中设置 Secrets**
   - `CLOUDFLARE_API_TOKEN` - Cloudflare API 令牌
   - `CLOUDFLARE_ACCOUNT_ID` - Cloudflare 账户 ID
   - `DEEPSEEK_API_KEY` - DeepSeek API Key

2. **推送代码到 main 分支**
```bash
git push origin main
```

GitHub Actions 将自动部署到 Cloudflare Workers。

## 🔧 配置选项

### 环境变量

| 变量名 | 必需 | 默认值 | 描述 |
|--------|------|--------|------|
| `DEEPSEEK_API_KEY` | ✅ | - | DeepSeek API 密钥 |
| `DEFAULT_MODEL` | ❌ | `deepseek-chat` | 默认使用的模型 |
| `MAX_TOKENS` | ❌ | `4000` | 最大令牌数 |
| `ALLOWED_ORIGINS` | ❌ | `*` | 允许的跨域来源 |

### KV 存储（可选）

启用 KV 存储可以记录聊天历史：

1. **创建 KV 命名空间**
```bash
wrangler kv:namespace create "CHAT_HISTORY"
```

2. **更新 wrangler.toml**
```toml
[[kv_namespaces]]
binding = "CHAT_HISTORY"
id = "your-namespace-id"
```

## 📝 使用示例

### JavaScript/TypeScript

```javascript
const response = await fetch('https://your-worker.workers.dev/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: '请写一个 JavaScript 函数来计算斐波那契数列'
      }
    ],
    model: 'deepseek-chat',
    max_tokens: 1000,
    temperature: 0.7
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### Python

```python
import requests

url = "https://your-worker.workers.dev/api/chat"
payload = {
    "messages": [
        {
            "role": "user", 
            "content": "请解释一下什么是机器学习"
        }
    ],
    "model": "deepseek-chat",
    "max_tokens": 1000,
    "temperature": 0.7
}

response = requests.post(url, json=payload)
data = response.json()
print(data["choices"][0]["message"]["content"])
```

### curl

```bash
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "你好，请介绍一下你自己"
      }
    ],
    "model": "deepseek-chat",
    "max_tokens": 1000,
    "temperature": 0.7
  }'
```

### 流式响应示例

```javascript
const response = await fetch('https://your-worker.workers.dev/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: '请写一个故事'
      }
    ],
    stream: true
  })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = new TextDecoder().decode(value);
  console.log(chunk);
}
```

## 🔒 安全最佳实践

1. **API Key 管理**
   - 永远不要在客户端代码中暴露 API Key
   - 使用 Cloudflare Workers 环境变量存储敏感信息
   - 定期轮换 API Key

2. **访问控制**
   - 配置 `ALLOWED_ORIGINS` 限制跨域访问
   - 考虑添加 IP 白名单或认证机制
   - 监控 API 使用情况

3. **速率限制**
   - 考虑实现基于 IP 的速率限制
   - 监控异常请求模式

## 🚨 错误处理

API 返回标准的 HTTP 状态码和错误信息：

```json
{
  "error": "messages 字段是必需的，且必须是数组",
  "timestamp": "2024-10-25T10:00:00.000Z"
}
```

常见错误状态码：
- `400` - 请求参数错误
- `401` - 认证失败
- `429` - 请求过于频繁
- `500` - 服务器内部错误

## 📊 监控和日志

### Cloudflare Analytics
- 在 Cloudflare Dashboard 中查看请求量、响应时间等指标
- 设置告警规则监控异常情况

### 自定义日志
如果启用了 KV 存储，将记录：
- 请求时间戳
- 使用的模型
- 消息数量
- Token 使用情况

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📄 许可证

本项目使用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🔗 相关链接

- [DeepSeek API 文档](https://platform.deepseek.com/api-docs/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

## 💡 常见问题

### Q: 如何获取 DeepSeek API Key？
A: 访问 [DeepSeek 平台](https://platform.deepseek.com/api_keys) 注册账户并创建 API Key。

### Q: 部署失败怎么办？
A: 检查以下几点：
- Cloudflare API Token 是否正确
- 账户 ID 是否正确
- 环境变量是否设置正确

### Q: 如何限制访问来源？
A: 设置 `ALLOWED_ORIGINS` 环境变量，例如：`https://yourdomain.com,https://app.yourdomain.com`

### Q: 支持哪些 DeepSeek 模型？
A: 支持所有 DeepSeek 提供的模型，默认使用 `deepseek-chat`。

---

如有任何问题，欢迎提交 [GitHub Issue](https://github.com/ashenghm/cloudflare-deepseek-chat-api/issues)！
