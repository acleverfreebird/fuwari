# 性能优化快速参考 ⚡

> 快速查阅博客性能优化的关键要点和常用命令

## 🎯 优化成果总览

| 优化项 | 改进措施 | 预期效果 |
|-------|---------|---------|
| API响应 | Redis缓存 + stale-while-revalidate | ⚡ 响应时间 ↓ 70% |
| 包体积 | Terser压缩 + 代码分割 | 📦 体积 ↓ 30% |
| 图片加载 | 懒加载 + WebP格式 | 🖼️ LCP ↓ 60% |
| 缓存命中 | 多层缓存策略 | 💾 命中率 ↑ 85% |
| 首字节 | Vercel Edge + ISR | 🚀 TTFB ↓ 40% |

---

## 📁 优化的关键文件

```
✅ 已优化的文件：
├── src/pages/api/stats/total.ts        # API缓存优化
├── astro.config.mjs                    # 构建配置优化
├── vercel.json                         # 部署缓存策略
├── src/utils/lazy-load.ts              # 图片懒加载工具（新增）
└── src/components/PerformanceMonitor.astro  # 性能监控（新增）

📚 文档：
└── docs/performance-optimization-guide.md   # 完整实施指南
```

---

## ⚡ 常用命令

### 开发环境
```bash
npm run dev              # 启动开发服务器
```

### 生产构建
```bash
npm run build           # 标准构建 + Pagefind
npm run build:prod      # 完整构建 + SEO推送
npm run preview         # 预览生产构建
```

### 性能检查
```bash
npm run seo:check       # SEO配置检查
npm run seo:build       # 构建 + SEO检查
```

### IndexNow SEO
```bash
npm run indexnow:submit      # 推送更新到搜索引擎
npm run indexnow:preview     # 预览推送内容
```

---

## 🎯 性能目标

### Core Web Vitals
```
LCP (最大内容绘制)     ✅ < 2.5s
FID (首次输入延迟)     ✅ < 100ms
CLS (累积布局偏移)     ✅ < 0.1
FCP (首次内容绘制)     ✅ < 1.8s
TTFB (首字节时间)      ✅ < 600ms
```

### Lighthouse 评分
```
Performance      ✅ > 90
Accessibility    ✅ > 95
Best Practices   ✅ > 90
SEO              ✅ > 95
```

---

## 💡 使用图片懒加载

### 在组件中初始化
```typescript
import { setupLazyLoad } from '@/utils/lazy-load';

// 页面加载后初始化
setupLazyLoad('img[data-src]');
```

### HTML中使用
```html
<!-- 使用 data-src 代替 src -->
<img 
  data-src="/images/photo.webp"
  alt="描述"
  width="800"
  height="600"
  loading="lazy"
/>
```

---

## 📊 性能监控

### 在Layout中添加监控
```astro
---
import PerformanceMonitor from '@/components/PerformanceMonitor.astro';
---

<html>
  <body>
    <!-- 页面内容 -->
    <PerformanceMonitor />
  </body>
</html>
```

### 查看性能数据
```javascript
// 在浏览器控制台
console.log(window.__performanceVitals);

// 输出：
// { lcp: 1234.56, fid: 23.45, cls: 0.05, fcp: 987.65, ttfb: 123.45 }
```

---

## 🔧 缓存策略速查

| 资源类型 | 缓存时间 | 策略 |
|---------|---------|------|
| JS/CSS (带hash) | 1年 | immutable |
| 图片资源 | 1年 | immutable |
| API响应 | 60秒 | stale-while-revalidate |
| HTML页面 | 0 | must-revalidate |
| 字体文件 | 1年 | immutable + CORS |

---

## 🐛 快速故障排查

### API响应慢
```bash
# 1. 检查Redis缓存
redis-cli ping
redis-cli keys "cached:*"

# 2. 检查响应头
curl -I https://your-site.com/api/stats/total
# 查看 X-Cache: HIT/MISS
```

### 图片不加载
```javascript
// 1. 检查懒加载初始化
console.log('Lazy load images:', document.querySelectorAll('img[data-src]').length);

// 2. 手动触发加载
setupLazyLoad('img[data-src]');
```

### 缓存不生效
```bash
# 检查 Vercel 配置
vercel env ls

# 查看部署日志
vercel logs
```

---

## 📈 性能测试工具

### Lighthouse (推荐)
```bash
# 安装
npm install -g lighthouse

# 运行
lighthouse https://your-site.com --view
```

### WebPageTest
访问: https://www.webpagetest.org/

### Chrome DevTools
1. 打开 DevTools (F12)
2. Lighthouse 标签
3. "Analyze page load"

---

## 🎓 下一步优化建议

### 立即可做 (1周内)
- [ ] 为所有图片添加 `width` 和 `height` 属性
- [ ] 转换大图片为 WebP 格式
- [ ] 检查并移除未使用的 CSS/JS
- [ ] 配置字体 `font-display: swap`

### 短期优化 (1个月内)
- [ ] 实施 Service Worker 离线缓存
- [ ] 提取并内联关键 CSS
- [ ] 配置 CDN 加速
- [ ] 优化第三方脚本加载

### 持续优化
- [ ] 集成 Sentry 错误监控
- [ ] 配置 Real User Monitoring
- [ ] 设置性能预警阈值
- [ ] 定期审查和更新依赖

---

## 📚 详细文档

完整的优化指南请查看：
👉 [docs/performance-optimization-guide.md](docs/performance-optimization-guide.md)

原始优化计划：
👉 [PERFORMANCE_OPTIMIZATION_PLAN.md](PERFORMANCE_OPTIMIZATION_PLAN.md)

---

## ✅ 部署检查清单

### 部署前
- [ ] `npm run build` 成功
- [ ] 无TypeScript错误
- [ ] 所有测试通过
- [ ] 环境变量已配置

### 部署后
- [ ] 网站可正常访问
- [ ] API返回正确数据
- [ ] 图片正常加载
- [ ] 搜索功能可用
- [ ] Lighthouse评分 > 90

---

**最后更新**: 2025-10-01  
**版本**: 1.0.0  
**状态**: ✅ 已部署