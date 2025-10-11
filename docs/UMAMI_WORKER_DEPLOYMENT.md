# Umami Cloudflare Worker 部署指南

本文档详细说明如何部署 Umami 统计 API 代理 Worker 到 Cloudflare。

## 📋 前置要求

1. **Cloudflare 账号**
   - 注册地址: https://dash.cloudflare.com/sign-up
   - 免费账号即可使用 Workers

2. **Umami API Token**
   - 登录你的 Umami 实例
   - 进入 Settings → API
   - 创建新的 API Token
   - 复制保存 Token (只显示一次)

3. **Umami Website ID**
   - 在 Umami 中找到你的网站
   - 复制 Website ID (格式: `726431d7-e252-486d-ab90-350313e5a519`)

## 🚀 部署步骤

### 方法一: 通过 Cloudflare Dashboard (推荐新手)

#### 1. 登录 Cloudflare Dashboard

访问 https://dash.cloudflare.com/ 并登录

#### 2. 进入 Workers & Pages

- 点击左侧菜单 "Workers & Pages"
- 点击 "Create application"
- 选择 "Create Worker"

#### 3. 创建 Worker

- 输入 Worker 名称,例如: `umami-stats-proxy`
- 点击 "Deploy"

#### 4. 编辑 Worker 代码

- 部署完成后,点击 "Edit code"
- 删除默认代码
- 复制 `cloudflare-worker/umami-stats-proxy.js` 的完整内容
- 粘贴到编辑器中

#### 5. 配置 Worker

在代码顶部的 `CONFIG` 对象中修改以下配置:

```javascript
const CONFIG = {
  // Umami API 地址 (不要包含末尾的斜杠)
  UMAMI_API_URL: 'https://views.freebird2913.tech/api',
  
  // Umami API Token (从 Umami Settings → API 获取)
  UMAMI_API_TOKEN: 'YOUR_UMAMI_API_TOKEN_HERE',  // ⚠️ 必须修改
  
  // Umami Website ID
  UMAMI_WEBSITE_ID: '726431d7-e252-486d-ab90-350313e5a519',
  
  // 允许的来源域名 (CORS)
  ALLOWED_ORIGINS: [
    'https://www.freebird2913.tech',
    'https://freebird2913.tech',
    'http://localhost:4321',
    'http://localhost:3000',
  ],
  
  // 缓存时间 (秒)
  CACHE_TTL: 300,  // 5分钟
};
```

**重要配置说明:**

- `UMAMI_API_URL`: 你的 Umami 实例 API 地址
- `UMAMI_API_TOKEN`: ⚠️ **必须替换为你的真实 Token**
- `UMAMI_WEBSITE_ID`: 你的网站 ID
- `ALLOWED_ORIGINS`: 添加你的所有域名(生产环境和开发环境)

#### 6. 保存并部署

- 点击右上角 "Save and Deploy"
- 等待部署完成

#### 7. 配置自定义域名 (可选但推荐)

- 返回 Worker 详情页
- 点击 "Settings" → "Triggers"
- 在 "Custom Domains" 部分点击 "Add Custom Domain"
- 输入子域名,例如: `get-views.freebird2913.tech`
- 点击 "Add Custom Domain"
- 等待 DNS 配置生效 (通常几分钟)

### 方法二: 通过 Wrangler CLI (推荐开发者)

#### 1. 安装 Wrangler

```bash
npm install -g wrangler
```

#### 2. 登录 Cloudflare

```bash
wrangler login
```

#### 3. 创建 wrangler.toml

在 `cloudflare-worker/` 目录下创建 `wrangler.toml`:

```toml
name = "umami-stats-proxy"
main = "umami-stats-proxy.js"
compatibility_date = "2024-01-01"

[env.production]
workers_dev = false
routes = [
  { pattern = "get-views.freebird2913.tech/*", zone_name = "freebird2913.tech" }
]
```

#### 4. 修改配置

编辑 `umami-stats-proxy.js` 中的 `CONFIG` 对象 (同上)

#### 5. 部署

```bash
cd cloudflare-worker
wrangler deploy
```

## 🧪 测试 Worker

### 1. 测试总浏览量 API

```bash
curl https://get-views.freebird2913.tech/stats/total
```

预期响应:
```json
{
  "pageviews": 12345,
  "visitors": 6789
}
```

### 2. 测试页面浏览量 API

```bash
curl "https://get-views.freebird2913.tech/stats/page?url=/posts/example"
```

预期响应:
```json
{
  "pageviews": 123,
  "visitors": 45
}
```

### 3. 测试 CORS

```bash
curl -H "Origin: https://www.freebird2913.tech" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://get-views.freebird2913.tech/stats/total
```

预期响应头应包含:
```
Access-Control-Allow-Origin: https://www.freebird2913.tech
Access-Control-Allow-Methods: GET, OPTIONS
```

## 🔧 配置博客

Worker 部署成功后,需要在博客中配置 Worker 地址。

### 1. 更新 src/config.ts

```typescript
export const umamiStatsConfig = {
	enable: true,
	apiUrl: "https://get-views.freebird2913.tech",  // 你的 Worker 地址
};
```

### 2. 重新构建并部署博客

```bash
npm run build
# 或
pnpm build
```

## 📊 验证功能

### 1. 检查首页总浏览量

- 访问博客首页
- 在侧边栏 Profile 卡片中应该看到总浏览量
- 打开浏览器开发者工具 → Network
- 应该看到对 `/stats/total` 的请求

### 2. 检查文章页浏览量

- 访问任意文章页面
- 在文章元信息中应该看到浏览量图标和数字
- 在 Network 中应该看到对 `/stats/page?url=...` 的请求

### 3. 检查缓存

- 刷新页面多次
- 在 5 分钟内,浏览量数字应该保持不变 (缓存生效)
- 5 分钟后刷新,数字应该更新

## 🔒 安全建议

### 1. 保护 API Token

- ✅ **正确**: Token 存储在 Worker 代码中 (服务器端)
- ❌ **错误**: 不要将 Token 暴露在前端代码中
- ❌ **错误**: 不要将 Token 提交到公开的 Git 仓库

### 2. 配置 CORS

只允许你自己的域名访问 Worker:

```javascript
ALLOWED_ORIGINS: [
  'https://www.freebird2913.tech',  // 生产环境
  'https://freebird2913.tech',      // 生产环境 (无 www)
  'http://localhost:4321',          // 开发环境
],
```

### 3. 限制请求频率 (可选)

如果担心滥用,可以在 Worker 中添加速率限制:

```javascript
// 在 CONFIG 中添加
RATE_LIMIT: {
  requests: 100,  // 每个 IP 每分钟最多 100 次请求
  window: 60,     // 时间窗口 (秒)
}
```

## 🐛 故障排查

### 问题 1: Worker 返回 500 错误

**可能原因:**
- API Token 未配置或错误
- Umami API 地址错误
- Website ID 错误

**解决方法:**
1. 检查 Worker 日志: Dashboard → Workers → 你的 Worker → Logs
2. 验证 `CONFIG` 中的所有配置
3. 测试 Umami API 是否可访问:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://views.freebird2913.tech/api/websites/YOUR_WEBSITE_ID/stats
   ```

### 问题 2: CORS 错误

**错误信息:**
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

**解决方法:**
1. 检查 `ALLOWED_ORIGINS` 是否包含你的域名
2. 确保域名格式正确 (包含协议,不包含末尾斜杠)
3. 检查是否使用了正确的域名 (www vs 非 www)

### 问题 3: 浏览量显示 "--"

**可能原因:**
- Worker API 请求失败
- 网络问题
- Umami 数据库中没有数据

**解决方法:**
1. 打开浏览器开发者工具 → Console
2. 查看是否有错误信息
3. 检查 Network 标签中的 API 请求
4. 验证 Umami 中是否有统计数据

### 问题 4: 浏览量不更新

**可能原因:**
- 缓存生效 (正常现象)
- Umami 追踪脚本未加载

**解决方法:**
1. 等待 5 分钟后刷新 (缓存过期)
2. 检查 Umami 追踪脚本是否正常加载
3. 在 Umami Dashboard 中验证是否有新的访问记录

## 📈 性能优化

### 1. 调整缓存时间

根据需求调整 `CACHE_TTL`:

- **实时性要求高**: 60-180 秒
- **平衡性能和实时性**: 300 秒 (默认)
- **性能优先**: 600-1800 秒

### 2. 使用 CDN

Cloudflare Workers 自动在全球边缘节点运行,无需额外配置。

### 3. 监控性能

在 Cloudflare Dashboard 中查看:
- Workers → 你的 Worker → Metrics
- 请求数、错误率、响应时间等

## 🔄 更新 Worker

### 方法 1: Dashboard

1. 进入 Workers → 你的 Worker
2. 点击 "Edit code"
3. 修改代码
4. 点击 "Save and Deploy"

### 方法 2: Wrangler CLI

```bash
cd cloudflare-worker
# 修改 umami-stats-proxy.js
wrangler deploy
```

## 💰 费用说明

Cloudflare Workers 免费套餐:
- ✅ 每天 100,000 次请求
- ✅ 10ms CPU 时间/请求
- ✅ 全球 CDN 加速

对于个人博客,免费套餐完全够用。

## 📚 相关文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Umami API 文档](https://umami.is/docs/api)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

## 🆘 获取帮助

如果遇到问题:

1. 查看本文档的故障排查部分
2. 检查 Cloudflare Workers 日志
3. 查看浏览器开发者工具的 Console 和 Network
4. 在项目 GitHub Issues 中提问

---

**部署完成后,记得测试所有功能是否正常工作!** 🎉