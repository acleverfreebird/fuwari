# IndexNow 优化系统 - 快速开始

## 🚀 快速使用

### 推送所有页面（推荐）
```bash
npm run indexnow:submit-all  # 推送所有发现的页面
npm run indexnow:preview     # 预览将推送的页面（不实际推送）
```

### 推送单个URL
```bash
npm run indexnow:cli submit https://www.freebird2913.tech/posts/my-post/
```

### 推送站点重要页面
```bash
npm run indexnow:cli submit-site
```

### 批量推送
```bash
npm run indexnow:cli submit-batch \
  https://www.freebird2913.tech/ \
  https://www.freebird2913.tech/about/ \
  https://www.freebird2913.tech/posts/post1/
```

### 构建后自动推送
```bash
npm run build:prod  # 构建并自动推送所有页面
npm run indexnow:submit-force  # 手动强制推送构建后的所有页面
```

## 🛠️ 管理命令

### 检查配置
```bash
npm run indexnow:config
```

### 测试连接
```bash
npm run indexnow:test
```

### 缓存管理
```bash
npm run indexnow:cache          # 查看缓存状态
npm run indexnow:cli cache --clear  # 清理缓存
```

## ✨ 主要优化特性

- ✅ **智能页面发现** - 自动从sitemap.xml和构建目录发现所有页面
- ✅ **多重发现机制** - 结合sitemap解析、目录扫描、重要页面备用
- ✅ **智能重试** - 自动重试失败请求，指数退避算法
- ✅ **URL缓存** - 24小时内避免重复推送
- ✅ **批量处理** - 自动分批，支持大量URL
- ✅ **频率限制** - 自动控制请求频率，避免被限制
- ✅ **错误处理** - 详细日志，区分可重试错误
- ✅ **去重排序** - 自动去除重复URL并按优先级排序
- ✅ **预览模式** - 支持干运行，查看将推送的URL
- ✅ **配置管理** - 集中配置，支持环境变量

## 📊 响应状态说明

IndexNow API的响应状态：
- `200` - 成功提交
- `202` - 已接受，正在处理
- `400` - 通常表示重复提交（正常情况）
- `422` - 内容验证问题（但可能仍有效）

系统会将这些状态码都视为成功，因为IndexNow的"错误"响应往往仍然表示提交有效。

## 🔧 环境变量配置

```bash
# 自定义站点URL
INDEXNOW_SITE_URL=https://your-site.com

# 自定义API密钥
INDEXNOW_API_KEY=your-api-key

# 自定义重试次数
INDEXNOW_MAX_RETRIES=5

# 自定义批次大小
INDEXNOW_BATCH_SIZE=50
```

## 📝 日志示例

成功推送的日志输出：
```
[IndexNow] 推送URL: https://www.freebird2913.tech/posts/example/
[IndexNow] https://api.indexnow.org/indexnow: 400 Bad Request (可接受的响应)
[IndexNow] https://www.bing.com/indexnow: 400 Bad Request (可接受的响应)
[IndexNow] https://yandex.com/indexnow: 422 Unprocessable Entity (可接受的响应)
推送结果: { '成功': true, '失败数': 0, '缓存命中': false }
```

智能页面发现的日志输出：
```
[IndexNow] 尝试 sitemap.xml...
[IndexNow] 从sitemap.xml解析到 16 个URL
[IndexNow] 尝试 构建目录扫描...
[IndexNow] 从构建目录发现 19 个页面
[IndexNow] 尝试 重要页面备用...
[IndexNow] 合并去重后共 20 个唯一URL
[IndexNow] 将推送以下URL:
  1. https://www.freebird2913.tech/
  2. https://www.freebird2913.tech/about/
  ... 还有 18 个URL
```

批量推送的日志输出：
```
[IndexNow] 分 1 批推送 20 个新URL
[IndexNow] 处理第 1/1 批 (20 个URL)
[IndexNow] 推送结果: { '总数': 20, '成功': 20, '失败': 0, '缓存命中': 0, '耗时': '1.11秒' }
[IndexNow] 缓存统计: 20 个URL已缓存
```

## 🎯 最佳实践

1. **发布新内容后立即推送**
   ```bash
   npm run indexnow:cli submit https://your-site.com/new-post/
   ```

2. **定期推送站点重要页面**
   ```bash
   npm run indexnow:cli submit-site
   ```

3. **构建部署时自动推送**
   ```bash
   npm run build:prod  # 包含自动推送
   ```

4. **监控推送结果**
   ```bash
   npm run indexnow:config  # 检查配置
   npm run indexnow:cache   # 查看缓存状态
   ```

## 🔍 故障排除

### 问题：推送失败
**解决方案：**
```bash
npm run indexnow:config  # 检查配置是否有效
npm run indexnow:test    # 测试端点连接
```

### 问题：想强制重新推送
**解决方案：**
```bash
npm run indexnow:cli submit https://example.com --force
npm run indexnow:cli cache --clear  # 清理缓存
```

### 问题：批量推送太慢
**解决方案：**
设置环境变量 `INDEXNOW_BATCH_SIZE=200` 增大批次大小。

---

更多详细信息请参考 [完整文档](./indexnow-optimization.md)。