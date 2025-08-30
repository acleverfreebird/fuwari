# IndexNow 自动推送功能说明

本项目已集成了 IndexNow 自动推送功能，可以在文章发布和网站构建时自动向搜索引擎推送URL，提高索引效率。

## 功能特点

### 🚀 自动推送
- **文章页面访问时自动推送**: 每当有用户访问文章页面时，系统会自动向搜索引擎推送该文章URL
- **构建时批量推送**: 网站构建完成后，自动批量推送所有文章和重要页面
- **智能环境检测**: 开发环境下仅模拟推送，生产环境才真正发送请求

### 🎯 支持的搜索引擎
- Bing (必应)
- Yandex (Яндекс)
- IndexNow API (通用)

### 📄 推送内容
- 所有已发布的文章页面
- 网站重要页面：首页、关于页、友链页、归档页

## 使用方法

### 1. 开发环境
开发环境下，推送功能会自动模拟，不会发送真实请求：
```bash
npm run dev
```

### 2. 生产构建
常规生产构建（不包含自动推送）：
```bash
npm run build
```

完整生产构建（包含自动推送）：
```bash
npm run build:prod
```

### 3. 手动推送
单独执行推送脚本：
```bash
npm run indexnow:submit
```

### 4. 使用API推送单个URL
```bash
curl -X POST "https://freebird2913.tech/api/indexnow" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://freebird2913.tech/posts/your-new-post/"}'
```

批量推送多个URL：
```bash
curl -X POST "https://freebird2913.tech/api/indexnow" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://freebird2913.tech/posts/post1/", "https://freebird2913.tech/posts/post2/"]}'
```

## 技术实现

### 文件结构
```
src/
├── utils/
│   └── indexnow-utils.ts          # IndexNow 工具函数
├── pages/
│   ├── api/
│   │   ├── indexnow.ts            # IndexNow API 端点
│   │   └── indexnow-key.txt.ts    # API 密钥文件
│   └── posts/
│       └── [...slug].astro        # 文章页面（集成自动推送）
└── public/
    └── f494d9ef355649f38fb34bf5740376c8.txt  # 密钥验证文件

scripts/
└── post-build.js                  # 构建后推送脚本

package.json                       # 包含推送命令
```

### 核心函数
- `submitUrlToIndexNow()` - 推送单个URL
- `submitUrlsToIndexNow()` - 批量推送多个URL  
- `submitPostToIndexNow()` - 推送单篇文章
- `submitPostsToIndexNow()` - 批量推送文章
- `submitSitePagesToIndexNow()` - 推送重要页面
- `smartSubmitUrl()` - 智能推送（根据环境判断）

### 自动推送触发时机
1. **用户访问文章页面时** - 生产环境下会自动推送该文章URL
2. **执行生产构建时** - 运行 `npm run build:prod` 会在构建完成后批量推送
3. **手动触发** - 使用 `npm run indexnow:submit` 命令

## 配置说明

### IndexNow 配置
配置位于 [`src/utils/indexnow-utils.ts`](../src/utils/indexnow-utils.ts) 文件中：

```typescript
// 网站URL
const SITE_URL = "https://freebird2913.tech";

// IndexNow API 密钥
const INDEXNOW_KEY = "f494d9ef355649f38fb34bf5740376c8";

// IndexNow API 端点
const INDEXNOW_ENDPOINTS = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow", 
    "https://yandex.com/indexnow",
];
```

### 环境检测
系统会自动检测运行环境：
- **开发环境**: 仅模拟推送，输出日志但不发送请求
- **生产环境**: 发送真实的推送请求

## 日志输出

### 成功推送
```
[IndexNow] 推送URL: https://freebird2913.tech/posts/sample-post/
[IndexNow] https://api.indexnow.org/indexnow: 200 OK
[IndexNow] https://www.bing.com/indexnow: 200 OK
[IndexNow] https://yandex.com/indexnow: 200 OK
[IndexNow] 推送完成: 3 成功, 0 失败
```

### 开发环境模拟
```
[IndexNow Dev] 模拟推送URL: https://freebird2913.tech/posts/sample-post/
```

### 构建时批量推送
```
[IndexNow] 开始构建后推送...
[IndexNow] 发现 8 篇文章
[IndexNow] 推送 12 个URL...
[IndexNow] 推送任务完成
```

## 故障排除

### 常见问题

1. **推送失败**
   - 检查网络连接
   - 确认 IndexNow 密钥正确
   - 验证 URL 格式是否正确

2. **密钥验证失败**
   - 确保 `public/f494d9ef355649f38fb34bf5740376c8.txt` 文件存在
   - 文件内容应与 `INDEXNOW_KEY` 一致

3. **环境检测错误**
   - 开发环境设置 `NODE_ENV=development`
   - 生产环境设置 `NODE_ENV=production`

### 调试方法

查看推送日志：
```bash
# 开启详细日志的构建
NODE_ENV=production npm run build:prod
```

单独测试推送脚本：
```bash
# 模拟推送（开发环境）
node scripts/post-build.js

# 真实推送（生产环境）  
NODE_ENV=production node scripts/post-build.js
```

## 安全注意事项

1. **API 密钥安全**: 虽然 IndexNow 密钥是公开的，但建议定期更换
2. **访问频率控制**: IndexNow 有速率限制，避免频繁推送相同URL
3. **错误处理**: 推送失败不会影响网站正常运行

## 性能影响

- **页面加载**: 自动推送是异步进行的，不会影响页面加载速度
- **构建时间**: 批量推送在构建完成后执行，略微延长部署时间
- **服务器负载**: 推送请求量很小，对服务器负载影响微乎其微

## 扩展功能

如需添加更多搜索引擎或自定义推送逻辑，可修改：
- [`src/utils/indexnow-utils.ts`](../src/utils/indexnow-utils.ts) - 核心工具函数
- [`scripts/post-build.js`](../scripts/post-build.js) - 构建后推送脚本
- [`src/pages/api/indexnow.ts`](../src/pages/api/indexnow.ts) - API 端点

## 相关文档

- [IndexNow 官方文档](https://www.indexnow.org/)
- [必应网站管理员工具](https://www.bing.com/webmasters)
- [Yandex 网站管理员工具](https://webmaster.yandex.com/)

---

通过这套自动推送系统，你的博客内容将能更快地被搜索引擎发现和索引，提升网站在搜索结果中的表现。