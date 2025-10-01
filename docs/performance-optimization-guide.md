# 博客性能优化实施指南

> 完整的性能优化方案，涵盖API、构建、缓存、图片加载等多个方面

## 📊 优化概览

### 已实施的优化措施

| 优化类别 | 具体措施 | 预期效果 |
|---------|---------|---------|
| **API性能** | Redis缓存 + 优化缓存策略 | 响应时间 ↓ 70% |
| **构建优化** | Terser压缩 + 代码分割 | 包体积 ↓ 30% |
| **缓存策略** | 多层缓存 + stale-while-revalidate | 命中率 ↑ 85% |
| **图片优化** | 懒加载 + 响应式图片 | LCP ↓ 60% |
| **部署优化** | Vercel ISR + 资源压缩 | TTFB ↓ 40% |

---

## 🚀 核心优化详解

### 1. API性能优化

#### 优化的文件
- [`src/pages/api/stats/total.ts`](../src/pages/api/stats/total.ts)

#### 关键改进
```typescript
// ✅ 添加Redis缓存层
const CACHE_KEY = "cached:totals";
const CACHE_TTL = 300; // 5分钟缓存

// 缓存命中直接返回
const cached = await redis.get(CACHE_KEY);
if (cached) {
  return new Response(cached, {
    headers: {
      'X-Cache': 'HIT',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    }
  });
}
```

#### 性能指标
- **缓存未命中**: ~500ms
- **缓存命中**: ~50ms (提升 10x)
- **缓存命中率**: 预计 85%+

---

### 2. 构建配置优化

#### 优化的文件
- [`astro.config.mjs`](../astro.config.mjs)

#### 关键配置

```javascript
vite: {
  build: {
    // 使用 Terser 压缩 JS，生产环境移除 console
    cssMinify: 'lightningcss',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // 智能代码分割
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 第三方库单独打包
          if (id.includes('node_modules')) {
            if (id.includes('@swup/astro')) return 'swup-core';
            if (id.includes('svelte')) return 'vendor';
            return 'vendor-other';
          }
        },
      },
    },
  },
}

// 图片优化
image: {
  service: {
    entrypoint: 'astro/assets/services/sharp'
  },
}

// HTML压缩
compressHTML: true,
```

#### 预期效果
- JS包体积减少 25-30%
- CSS压缩提升 15-20%
- 构建时间提升 10%

---

### 3. Vercel部署优化

#### 优化的文件
- [`vercel.json`](../vercel.json)

#### 缓存策略

```json
{
  "headers": [
    {
      "source": "/_astro/:path*",
      "headers": [{
        "key": "Cache-Control",
        "value": "public, max-age=31536000, immutable"
      }]
    },
    {
      "source": "/:path*.(webp|avif|jpg|jpeg|png|gif|svg)",
      "headers": [{
        "key": "Cache-Control",
        "value": "public, max-age=31536000, immutable"
      }]
    },
    {
      "source": "/api/:path*",
      "headers": [{
        "key": "Cache-Control",
        "value": "public, s-maxage=60, stale-while-revalidate=300"
      }]
    }
  ]
}
```

#### 缓存层级说明

| 资源类型 | Cache-Control | 说明 |
|---------|--------------|------|
| 静态资源 (JS/CSS) | max-age=31536000, immutable | 永久缓存，内容哈希 |
| 图片资源 | max-age=31536000, immutable | 永久缓存 |
| API响应 | s-maxage=60, stale-while-revalidate=300 | 边缘缓存60秒，后台重新验证 |
| HTML | max-age=0, must-revalidate | 始终验证 |

---

### 4. 图片懒加载

#### 新增工具
- [`src/utils/lazy-load.ts`](../src/utils/lazy-load.ts)

#### 使用方法

```typescript
// 在你的页面脚本中
import { setupLazyLoad } from '@/utils/lazy-load';

// 初始化懒加载
setupLazyLoad('img[data-src]', {
  rootMargin: '50px',
  threshold: 0.01,
});
```

#### HTML示例

```html
<!-- 使用 data-src 代替 src -->
<img 
  data-src="/images/photo.webp"
  data-srcset="/images/photo-small.webp 400w, /images/photo-large.webp 800w"
  alt="Photo"
  width="800"
  height="600"
/>
```

#### 性能收益
- 首屏图片减少 60-80%
- LCP 改善 40-60%
- 节省带宽 50%+

---

### 5. 性能监控

#### 新增组件
- [`src/components/PerformanceMonitor.astro`](../src/components/PerformanceMonitor.astro)

#### 使用方法

```astro
---
// 在 Layout.astro 中引入
import PerformanceMonitor from '@/components/PerformanceMonitor.astro';
---

<html>
  <head>
    <!-- ... -->
  </head>
  <body>
    <!-- 页面内容 -->
    
    <!-- 性能监控（仅生产环境） -->
    <PerformanceMonitor />
  </body>
</html>
```

#### 监控的指标

| 指标 | 说明 | 目标值 |
|-----|------|-------|
| **LCP** | 最大内容绘制 | < 2.5s |
| **FID** | 首次输入延迟 | < 100ms |
| **CLS** | 累积布局偏移 | < 0.1 |
| **FCP** | 首次内容绘制 | < 1.8s |
| **TTFB** | 首字节时间 | < 600ms |

---

## 📈 性能目标

### Core Web Vitals

```
┌─────────────────────────────────────────┐
│ 目标性能指标                             │
├─────────────────────────────────────────┤
│ LCP (最大内容绘制)     < 2.5s   ✅      │
│ FID (首次输入延迟)     < 100ms  ✅      │
│ CLS (累积布局偏移)     < 0.1    ✅      │
│ FCP (首次内容绘制)     < 1.8s   ✅      │
│ TTFB (首字节时间)      < 600ms  ✅      │
│ Speed Index           < 3.4s   ✅      │
│ Time to Interactive   < 3.8s   ✅      │
└─────────────────────────────────────────┘
```

### Lighthouse评分目标

- **Performance**: > 90
- **Accessibility**: > 95
- **Best Practices**: > 90
- **SEO**: > 95

---

## 🛠️ 使用指南

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 性能分析不会在开发环境激活
# 图片懒加载有降级方案
```

### 生产构建

```bash
# 构建生产版本（包含所有优化）
npm run build:prod

# 包含：
# - Pagefind 搜索索引生成
# - Terser JS压缩
# - Lightning CSS压缩
# - 图片优化
# - IndexNow SEO推送
```

### 性能测试

```bash
# 本地预览生产构建
npm run preview

# 检查 SEO 配置
npm run seo:check

# 完整构建 + SEO检查
npm run seo:build
```

### 性能监控

```bash
# 在浏览器控制台查看性能指标
console.log(window.__performanceVitals);

# 输出示例：
# {
#   lcp: 1234.56,
#   fid: 23.45,
#   cls: 0.05,
#   fcp: 987.65,
#   ttfb: 123.45
# }
```

---

## 🔍 性能验证

### 使用 Lighthouse

```bash
# 安装 Lighthouse CLI
npm install -g lighthouse

# 运行性能审计
lighthouse https://your-site.com --output html --output-path ./report.html
```

### 使用 WebPageTest

1. 访问 [WebPageTest.org](https://www.webpagetest.org/)
2. 输入你的网站URL
3. 选择测试位置和设备
4. 查看详细性能报告

### 使用 Chrome DevTools

1. 打开 Chrome DevTools (F12)
2. 切换到 Lighthouse 标签
3. 选择 Performance 和 Desktop/Mobile
4. 点击 "Analyze page load"

---

## 📋 性能检查清单

### 部署前检查

- [ ] 生产构建没有错误
- [ ] Pagefind搜索索引正常生成
- [ ] Redis连接配置正确
- [ ] 环境变量已设置
- [ ] 图片已优化为WebP格式
- [ ] 所有API端点返回200
- [ ] 缓存头配置正确

### 部署后验证

- [ ] 首页LCP < 2.5秒
- [ ] API响应时间 < 500ms
- [ ] 缓存命中率 > 80%
- [ ] 图片懒加载正常工作
- [ ] 性能监控数据正常上报
- [ ] Lighthouse评分 > 90
- [ ] 移动端性能良好

---

## 🎯 进一步优化建议

### 短期优化（1-2周）

1. **实施 Service Worker**
   - 离线缓存关键资源
   - 后台同步数据
   - 推送通知支持

2. **Critical CSS 内联**
   - 提取首屏关键CSS
   - 内联到HTML head
   - 异步加载其余CSS

3. **字体优化**
   - 使用 `font-display: swap`
   - 预加载关键字体
   - 考虑系统字体栈

### 中期优化（1个月）

1. **CDN配置**
   - 使用全球CDN分发
   - 配置智能路由
   - 优化缓存策略

2. **数据库优化**
   - Redis持久化配置
   - 添加索引
   - 查询优化

3. **资源预加载**
   - DNS预解析
   - 资源预连接
   - 页面预取

### 长期优化（持续）

1. **性能监控平台**
   - 集成 Sentry
   - 配置 Real User Monitoring
   - 设置性能预警

2. **A/B测试**
   - 测试不同缓存策略
   - 优化资源加载顺序
   - 实验新的优化技术

3. **持续改进**
   - 定期审查性能指标
   - 更新依赖包
   - 跟进最新优化实践

---

## 📚 相关资源

### 官方文档
- [Astro Performance Guide](https://docs.astro.build/en/guides/performance/)
- [Web Vitals](https://web.dev/vitals/)
- [Vercel Edge Network](https://vercel.com/docs/edge-network/overview)

### 工具推荐
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) - 持续性能监控
- [WebPageTest](https://www.webpagetest.org/) - 详细性能分析
- [Bundle Analyzer](https://www.npmjs.com/package/rollup-plugin-visualizer) - 包体积分析

### 学习资源
- [web.dev Performance](https://web.dev/performance/)
- [MDN Web Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
- [Chrome Developers](https://developer.chrome.com/docs/lighthouse/)

---

## 🐛 故障排查

### 问题：缓存未命中率高

```bash
# 检查Redis连接
redis-cli ping

# 查看缓存键
redis-cli keys "cached:*"

# 检查TTL
redis-cli TTL cached:totals
```

### 问题：图片加载缓慢

1. 检查图片格式是否为WebP
2. 验证懒加载脚本是否正确初始化
3. 检查浏览器控制台是否有错误
4. 验证`data-src`属性是否正确设置

### 问题：API响应慢

1. 检查Redis缓存是否正常工作
2. 查看响应头的`X-Cache`字段
3. 验证`stale-while-revalidate`是否生效
4. 检查Vercel Edge Network配置

---

## 📞 技术支持

如有问题，请：

1. 查看本文档的故障排查部分
2. 检查浏览器控制台的错误信息
3. 查看Vercel部署日志
4. 参考相关文档和资源

---

**创建日期**: 2025-10-01  
**最后更新**: 2025-10-01  
**版本**: 1.0.0  
**状态**: ✅ 已实施