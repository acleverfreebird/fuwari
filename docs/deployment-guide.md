# 阅读量和访问量功能部署指南

## 概述

本指南将详细说明如何将阅读量和访问量功能部署到生产环境，包括数据存储配置、环境变量设置和性能优化。

## 部署选项

### 方案一：Vercel + Vercel KV（推荐）

#### 1. 创建 Vercel KV 数据库

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入您的项目设置
3. 点击 "Storage" 选项卡
4. 点击 "Create Database" 选择 "KV"
5. 输入数据库名称（如：`blog-analytics`）
6. 选择地区（建议选择离用户最近的地区）
7. 点击创建

#### 2. 获取数据库连接信息

创建完成后，Vercel 会自动为您的项目添加以下环境变量：
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_URL`

#### 3. 更新 API 代码

将所有 API 文件中的模拟存储替换为真实的 KV 调用：

**更新 `src/pages/api/stats/[slug].ts`：**
```typescript
import { kv } from "@vercel/kv";
import type { APIRoute } from "astro";

// 删除模拟 KV 相关代码，替换为：
async function kvGet(key: string): Promise<string | null> {
  return await kv.get(key);
}

async function kvSet(key: string, value: string): Promise<void> {
  await kv.set(key, value);
}

async function kvIncr(key: string): Promise<number> {
  return await kv.incr(key);
}

// 其余代码保持不变
```

**同样的更新应用到：**
- `src/pages/api/views/[slug].ts`
- `src/pages/api/reads/[slug].ts`

#### 4. 安装依赖

在项目根目录运行：
```bash
pnpm add @vercel/kv
```

#### 5. 更新 package.json

确保您的 package.json 包含 Vercel 适配器：
```json
{
  "dependencies": {
    "@vercel/kv": "^latest",
    "@astrojs/vercel": "^latest"
  }
}
```

#### 6. 配置 astro.config.mjs

```javascript
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  // ... 其他配置
});
```

#### 7. 部署

```bash
# 构建项目
pnpm build

# 部署到 Vercel（如果配置了 Vercel CLI）
vercel --prod
```

或者通过 Git 推送自动部署。

### 方案二：Netlify + Upstash Redis

#### 1. 创建 Upstash Redis 数据库

1. 访问 [Upstash Console](https://console.upstash.com/)
2. 注册/登录账户
3. 点击 "Create Database"
4. 选择地区和配置
5. 记录 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`

#### 2. 配置 Netlify 环境变量

1. 在 Netlify Dashboard 中打开您的项目
2. 进入 "Site settings" → "Environment variables"
3. 添加以下变量：
   - `UPSTASH_REDIS_REST_URL`：您的 Redis REST URL
   - `UPSTASH_REDIS_REST_TOKEN`：您的 Redis REST Token

#### 3. 更新 netlify/functions/views.ts

将现有的 `netlify/functions/views.ts` 中的模拟客户端替换为真实的 Upstash 客户端（代码已存在，只需取消注释并删除模拟代码）。

#### 4. 部署

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm build

# 部署到 Netlify
netlify deploy --prod --dir=dist
```

### 方案三：自建 Redis

#### 1. 部署 Redis 服务器

可以选择：
- Docker 部署
- 云服务商的 Redis 服务（AWS ElastiCache、阿里云 Redis 等）
- 自建 Redis 服务器

#### 2. 安装 Redis 客户端

```bash
pnpm add redis
```

#### 3. 创建 Redis 连接工具

创建 `src/utils/redis.ts`：
```typescript
import { Redis } from 'redis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export default redis;
```

#### 4. 更新 API 代码

```typescript
import redis from '@/utils/redis';

async function kvGet(key: string): Promise<string | null> {
  return await redis.get(key);
}

async function kvSet(key: string, value: string): Promise<void> {
  await redis.set(key, value);
}

async function kvIncr(key: string): Promise<number> {
  return await redis.incr(key);
}
```

## 环境变量配置

### Vercel KV
```env
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
KV_URL=your_kv_connection_string
```

### Upstash Redis
```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 自建 Redis
```env
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

## 性能优化配置

### 1. 缓存策略

在 API 响应中设置适当的缓存头：
```typescript
return new Response(JSON.stringify(response), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=60, s-maxage=60", // 缓存1分钟
    "Access-Control-Allow-Origin": "*"
  }
});
```

### 2. CDN 配置

如果使用 Vercel：
```javascript
// vercel.json
{
  "functions": {
    "src/pages/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=60"
        }
      ]
    }
  ]
}
```

### 3. 数据库连接优化

使用连接池和适当的超时设置：
```typescript
const redisConfig = {
  connectTimeout: 5000,
  commandTimeout: 5000,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};
```

## 监控和日志

### 1. 添加错误监控

建议集成 Sentry 或其他错误监控服务：
```bash
pnpm add @sentry/node @sentry/astro
```

### 2. 添加性能监控

```typescript
// 在 API 中添加性能监控
const startTime = Date.now();
// ... API 逻辑
const duration = Date.now() - startTime;
console.log(`API ${endpoint} took ${duration}ms`);
```

### 3. 健康检查端点

创建 `src/pages/api/health.ts`：
```typescript
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  try {
    // 检查数据库连接
    await kvGet("health-check");
    
    return new Response(JSON.stringify({
      status: "healthy",
      timestamp: Date.now(),
      database: "connected"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "unhealthy",
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

## 安全性配置

### 1. 限流

添加 API 限流保护：
```typescript
// 简单的内存限流（生产环境建议使用 Redis）
const rateLimit = new Map();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60 * 1000; // 1分钟窗口
  
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, []);
  }
  
  const requests = rateLimit.get(ip).filter(time => time > windowStart);
  
  if (requests.length >= 100) { // 每分钟最多100个请求
    return false;
  }
  
  requests.push(now);
  rateLimit.set(ip, requests);
  return true;
}
```

### 2. 数据验证

```typescript
function validateSlug(slug: string): boolean {
  // 验证 slug 格式，防止注入攻击
  return /^[a-zA-Z0-9\-_]+$/.test(slug);
}
```

## 数据备份

### 1. 定期备份脚本

创建 `scripts/backup-analytics.js`：
```javascript
#!/usr/bin/env node

const { kv } = require('@vercel/kv');
const fs = require('fs');

async function backup() {
  const keys = await kv.keys('views:*');
  const readKeys = await kv.keys('reads:*');
  
  const data = {};
  
  for (const key of [...keys, ...readKeys]) {
    data[key] = await kv.get(key);
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `analytics-backup-${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Backup saved to ${filename}`);
}

backup().catch(console.error);
```

### 2. 添加到 package.json

```json
{
  "scripts": {
    "backup": "node scripts/backup-analytics.js",
    "restore": "node scripts/restore-analytics.js"
  }
}
```

## 故障排除

### 常见问题

#### 1. API 500 错误
- 检查环境变量是否正确设置
- 检查数据库连接是否正常
- 查看服务器日志了解具体错误

#### 2. 统计数据不更新
- 检查客户端脚本是否正确加载
- 检查浏览器网络请求是否成功
- 验证 API 端点是否正常响应

#### 3. 性能问题
- 检查数据库响应时间
- 优化 API 缓存策略
- 考虑使用 CDN 加速

### 调试工具

#### 1. 开发环境调试
```typescript
// 在 API 中添加调试日志
console.log('DEBUG:', { slug, viewCount, readCount });
```

#### 2. 生产环境监控
使用 Vercel Analytics 或 Netlify Analytics 监控 API 性能。

## 上线检查清单

- [ ] 数据库已创建并配置
- [ ] 环境变量已设置
- [ ] API 代码已更新为使用真实存储
- [ ] 依赖包已安装
- [ ] 缓存策略已配置
- [ ] 错误监控已集成
- [ ] 健康检查端点已创建
- [ ] 限流保护已添加
- [ ] 备份脚本已创建
- [ ] 测试所有功能正常工作

## 维护建议

1. **定期备份数据**：每天或每周备份统计数据
2. **监控 API 性能**：关注响应时间和错误率
3. **检查数据库使用量**：避免超出配额限制
4. **更新依赖包**：定期更新相关包的版本
5. **清理过期数据**：定期清理用户会话数据以节省空间

按照本指南进行部署，您的阅读量和访问量功能将能稳定运行在生产环境中。