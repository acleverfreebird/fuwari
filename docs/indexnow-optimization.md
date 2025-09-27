# IndexNow 优化系统

## 概述

本文档介绍了对 Bing IndexNow 推送机制的全面优化，包括重试机制、缓存、批量处理、频率限制等多项改进。

## 优化内容

### 1. 集中化配置管理

- **文件**: `src/config/indexnow-config.ts`
- **功能**: 统一管理所有 IndexNow 相关配置
- **特性**:
  - 支持环境变量覆盖
  - 配置验证
  - 默认配置与自定义配置合并

### 2. 智能重试机制

- **策略**: 指数退避算法
- **配置**:
  - 最大重试次数: 3次
  - 初始延迟: 1秒
  - 最大延迟: 10秒
  - 退避因子: 2倍
- **错误分类**: 自动识别可重试错误（5xx、429、408、网络错误）

### 3. URL 缓存机制

- **目的**: 避免重复推送相同URL
- **有效期**: 24小时（可配置）
- **内存管理**: 自动清理过期缓存
- **缓存命中**: 减少不必要的API调用

### 4. 批量处理优化

- **批次大小**: 100个URL/批次（可配置）
- **最大批次**: 10000个URL
- **分批延迟**: 批次间1秒延迟
- **URL去重**: 自动去除重复URL

### 5. 频率限制

- **限制**: 10次请求/分钟
- **自动等待**: 达到限制时自动等待
- **请求记录**: 追踪最近一分钟的请求

### 6. 增强错误处理

- **详细日志**: 记录每个端点的响应状态
- **错误分类**: 区分可重试和不可重试错误
- **统计信息**: 提供详细的推送统计

## 使用方法

### API 使用

```typescript
import { getIndexNowClient } from '../utils/indexnow-optimized.js';

// 获取客户端实例
const client = getIndexNowClient();

// 推送单个URL
const result = await client.submitUrl('https://example.com/page');

// 批量推送URL
const result = await client.submitUrls([
  'https://example.com/page1',
  'https://example.com/page2'
]);

// 推送站点重要页面
const result = await client.submitSitePages();

// 推送文章
const result = await client.submitPost(postEntry);
const result = await client.submitPosts(postEntries);
```

### CLI 工具使用

```bash
# 推送单个URL
node scripts/indexnow-cli.js submit https://example.com/page

# 强制推送（忽略缓存）
node scripts/indexnow-cli.js submit https://example.com/page --force

# 批量推送
node scripts/indexnow-cli.js submit-batch https://example.com/page1 https://example.com/page2

# 推送站点重要页面
node scripts/indexnow-cli.js submit-site

# 查看缓存统计
node scripts/indexnow-cli.js cache --stats

# 清理缓存
node scripts/indexnow-cli.js cache --clear

# 检查配置
node scripts/indexnow-cli.js config

# 测试端点连接
node scripts/indexnow-cli.js test

# 显示帮助
node scripts/indexnow-cli.js help
```

### 构建后自动推送

构建完成后自动运行：

```bash
# 生产环境自动推送
npm run build  # 构建完成后自动推送

# 手动推送（开发环境）
node scripts/post-build.js --force
```

## 配置选项

### 环境变量

```bash
# 站点URL
INDEXNOW_SITE_URL=https://your-site.com

# API密钥
INDEXNOW_API_KEY=your-api-key

# 密钥文件位置
INDEXNOW_KEY_LOCATION=https://your-site.com/your-key.txt

# 最大重试次数
INDEXNOW_MAX_RETRIES=3

# 批次大小
INDEXNOW_BATCH_SIZE=100
```

### 配置文件

修改 `src/config/indexnow-config.ts` 中的默认配置：

```typescript
export const DEFAULT_INDEXNOW_CONFIG: IndexNowConfig = {
  siteUrl: "https://your-site.com",
  apiKey: "your-api-key",
  // 其他配置...
};
```

## 响应格式

优化后的响应包含更详细的信息：

```typescript
interface IndexNowResponse {
  success: boolean;           // 整体成功状态
  submitted: string | string[]; // 提交的URL
  results: Array<{           // 每个端点的详细结果
    endpoint?: string;       // API端点
    status?: number;         // HTTP状态码
    statusText?: string;     // 状态文本
    error?: unknown;         // 错误信息
    retries?: number;        // 重试次数
  }>;
  totalProcessed: number;    // 总处理数量
  failures: number;          // 失败数量
  cached: number;           // 缓存命中数量
}
```

## 性能优化

### 1. 缓存优化
- 24小时缓存有效期
- 内存管理，避免无限增长
- 批量缓存操作

### 2. 网络优化
- 并行请求多个端点
- 智能重试机制
- 请求超时控制（30秒）

### 3. 批量优化
- 自动分批处理大量URL
- 批次间延迟控制
- URL去重

### 4. 频率控制
- 自动频率限制
- 智能等待机制
- 请求分散

## 监控与调试

### 日志输出

系统提供详细的日志输出：

```
[IndexNow] 推送URL: https://example.com/page
[IndexNow] 分 2 批推送 150 个新URL
[IndexNow] 处理第 1/2 批 (100 个URL)
[IndexNow] https://api.indexnow.org/indexnow: 200 OK
[IndexNow] https://www.bing.com/indexnow: 200 OK
[IndexNow] 推送完成: 3 成功, 0 失败
[IndexNow] 缓存统计: 150 个URL已缓存
```

### 错误处理

系统会自动处理各种错误情况：

- 网络连接错误
- 服务器错误（5xx）
- 频率限制（429）
- 超时错误
- 配置错误

## 迁移指南

### 从旧版本迁移

1. **更新导入**:
   ```typescript
   // 旧版本
   import { submitUrlToIndexNow } from '../utils/indexnow-utils.js';

   // 新版本
   import { getIndexNowClient } from '../utils/indexnow-optimized.js';
   const client = getIndexNowClient();
   ```

2. **更新函数调用**:
   ```typescript
   // 旧版本
   const result = await submitUrlToIndexNow(url);

   // 新版本
   const result = await client.submitUrl(url);
   ```

3. **响应格式变化**:
   新版本响应包含更多信息，包括 `totalProcessed`、`failures`、`cached` 等字段。

### 向后兼容

旧的函数仍然可用，但建议迁移到新的客户端API：

```typescript
// 这些函数仍然可用，但内部使用优化实现
import { submitUrlToIndexNow, submitUrlsToIndexNow } from '../utils/indexnow-optimized.js';
```

## 最佳实践

### 1. 推送时机
- 新文章发布后立即推送
- 文章更新后推送
- 定期推送站点重要页面

### 2. 缓存管理
- 定期清理缓存（如果需要强制重新推送）
- 监控缓存命中率
- 合理设置缓存有效期

### 3. 错误处理
- 监控推送失败率
- 定期检查API端点状态
- 设置适当的重试次数

### 4. 性能优化
- 使用批量推送代替单个推送
- 避免推送重复URL
- 合理设置批次大小

## 故障排除

### 常见问题

1. **推送失败**
   - 检查API密钥是否正确
   - 确认密钥文件可访问
   - 验证URL格式

2. **缓存问题**
   - 使用 `--force` 选项强制推送
   - 使用 CLI 工具清理缓存

3. **频率限制**
   - 等待一分钟后重试
   - 调整批次大小
   - 减少推送频率

### 调试命令

```bash
# 检查配置
node scripts/indexnow-cli.js config

# 测试连接
node scripts/indexnow-cli.js test

# 查看缓存状态
node scripts/indexnow-cli.js cache --stats
```

## 更新日志

### v1.0.0 (优化版本)
- ✅ 添加智能重试机制
- ✅ 实现URL缓存系统
- ✅ 支持批量处理优化
- ✅ 添加频率限制
- ✅ 增强错误处理和日志
- ✅ 提供CLI管理工具
- ✅ 集中化配置管理
- ✅ 向后兼容支持