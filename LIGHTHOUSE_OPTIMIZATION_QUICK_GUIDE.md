# Lighthouse 性能优化快速指南

> 基于Lighthouse报告的快速优化检查清单和代码片段

## 🎯 核心问题速览

| 问题 | 当前值 | 目标值 | 优先级 |
|------|--------|--------|--------|
| LCP | 4.8s | <2.5s | 🔴 P0 |
| 渲染阻塞CSS | 40KB | <15KB | 🔴 P0 |
| 未使用CSS | 31KB | 0KB | 🟡 P1 |
| 未使用JS | 731KB | <100KB | 🟡 P1 |
| 网络依赖链 | 13.9s | <5s | 🔴 P0 |
| 强制重排 | 148ms | 0ms | 🟡 P1 |

---

## ⚡ 立即可执行的优化 (< 30分钟)

### 1. 优化资源预连接

**文件**: [`src/layouts/Layout.astro`](src/layouts/Layout.astro:90)

```astro
<!-- 在<head>中添加/更新 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://get-views.freebird2913.tech">
<link rel="dns-prefetch" href="https://v1.hitokoto.cn">
<link rel="dns-prefetch" href="https://api.iconify.design">
```

### 2. 优化LCP图片

**文件**: 找到LCP图片元素 (`img.w-full.h-full.object-cover`)

```astro
<!-- 添加预加载 -->
<link rel="preload" as="image" href="/path/to/lcp-image.webp" fetchpriority="high">

<!-- 优化图片标签 -->
<img 
  src="/path/to/lcp-image.webp"
  alt="描述"
  width="1200"
  height="630"
  fetchpriority="high"
  loading="eager"
  decoding="sync"
  class="w-full h-full object-cover"
/>
```

### 3. 延迟非关键CSS

**文件**: [`src/layouts/Layout.astro`](src/layouts/Layout.astro:1)

```astro
<!-- 将非关键CSS改为异步加载 -->
<link rel="preload" 
      href="/_astro/_page_.CEKSadAt.css" 
      as="style" 
      onload="this.onload=null;this.rel='stylesheet'">
<noscript>
  <link rel="stylesheet" href="/_astro/_page_.CEKSadAt.css">
</noscript>
```

### 4. 延迟第三方脚本

**文件**: [`src/layouts/Layout.astro`](src/layouts/Layout.astro:229)

```javascript
// 将Clarity加载延迟到10秒后
setTimeout(loadClarity, 10000);

// 或在用户首次交互时加载
['click', 'scroll', 'keydown'].forEach(event => {
  window.addEventListener(event, loadClarity, { once: true, passive: true });
});
```

---

## 🔧 关键优化 (1-2天)

### 1. 内联关键CSS

**文件**: [`src/layouts/Layout.astro`](src/layouts/Layout.astro:1)

```astro
<style is:inline>
/* 仅包含首屏必需的样式 */
:root {
  --hue: 250;
  --page-bg: oklch(0.95 0.01 var(--hue));
  --card-bg: oklch(0.98 0.01 var(--hue));
}

body {
  background: var(--page-bg);
  transition: background-color 0.3s;
}

.card-base {
  border-radius: 1rem;
  background: var(--card-bg);
  overflow: hidden;
}
</style>
```

**配置**: [`astro.config.mjs`](astro.config.mjs:258)

```javascript
export default defineConfig({
  build: {
    inlineStylesheets: 'always', // 内联小CSS文件
  }
});
```

### 2. 优化JavaScript代码分割

**文件**: [`astro.config.mjs`](astro.config.mjs:204)

```javascript
vite: {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 核心框架 - 合并Swup相关模块
          'swup-bundle': ['@swup/astro', '/@swup/'],
          // UI组件
          'ui-components': ['photoswipe', 'overlayscrollbars'],
          // 工具库
          'utils': ['@iconify/svelte'],
        }
      }
    }
  }
}
```

### 3. 消除强制重排

**文件**: [`src/layouts/Layout.astro`](src/layouts/Layout.astro:697)

```javascript
// ❌ 当前代码 - 导致强制重排
window.onresize = () => {
  let offset = Math.floor(window.innerHeight * (BANNER_HEIGHT_EXTEND / 100));
  offset = offset - offset % 4;
  document.documentElement.style.setProperty('--banner-height-extend', `${offset}px`);
}

// ✅ 优化后 - 使用requestAnimationFrame
window.onresize = () => {
  requestAnimationFrame(() => {
    let offset = Math.floor(window.innerHeight * (BANNER_HEIGHT_EXTEND / 100));
    offset = offset - offset % 4;
    document.documentElement.style.setProperty('--banner-height-extend', `${offset}px`);
  });
}
```

### 4. 实施图片懒加载

**创建组件**: `src/components/misc/OptimizedImage.astro`

```astro
---
interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

const { src, alt, width, height, priority = false } = Astro.props;
---

<img 
  src={src}
  alt={alt}
  width={width}
  height={height}
  loading={priority ? 'eager' : 'lazy'}
  fetchpriority={priority ? 'high' : 'auto'}
  decoding={priority ? 'sync' : 'async'}
/>
```

---

## 📊 优化效果验证

### 本地测试

```bash
# 1. 构建生产版本
npm run build

# 2. 预览生产版本
npm run preview

# 3. 运行Lighthouse
npx lighthouse http://localhost:4321 --view
```

### 关键指标检查

```javascript
// 在浏览器控制台运行
const metrics = {
  FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
  LCP: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime,
  CLS: performance.getEntriesByName('layout-shift')[0]?.value
};
console.table(metrics);
```

---

## 🎨 CSS优化清单

### 移除未使用的CSS

**安装PurgeCSS**:
```bash
pnpm add -D @fullhuman/postcss-purgecss
```

**配置**: `postcss.config.mjs`

```javascript
import purgecss from '@fullhuman/postcss-purgecss';

export default {
  plugins: [
    purgecss({
      content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
      safelist: ['dark', 'light', /^swup-/, /^transition-/],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
    })
  ]
};
```

### 关键CSS提取

**方案1**: 使用Astro内联样式
```astro
<style is:inline>
  /* 关键CSS */
</style>
```

**方案2**: 使用Critical CSS工具
```bash
pnpm add -D critical
```

---

## 🚀 JavaScript优化清单

### 1. 动态导入非关键模块

**文件**: [`src/layouts/Layout.astro`](src/layouts/Layout.astro:709)

```javascript
// ❌ 同步导入
import PhotoSwipeLightbox from 'photoswipe/lightbox';

// ✅ 动态导入
if ('requestIdleCallback' in window) {
  requestIdleCallback(async () => {
    const { default: PhotoSwipeLightbox } = await import('photoswipe/lightbox');
    // 初始化
  });
}
```

### 2. 拆分长任务

```javascript
async function processLargeTask(items) {
  const CHUNK_SIZE = 50;
  
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    
    // 处理chunk
    processChunk(chunk);
    
    // 让出主线程
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

### 3. 使用Passive事件监听器

```javascript
// ❌ 阻塞滚动
window.addEventListener('scroll', handleScroll);

// ✅ 非阻塞滚动
window.addEventListener('scroll', handleScroll, { passive: true });
```

---

## 🖼️ 图片优化清单

### 1. 使用现代图片格式

```astro
<picture>
  <source srcset="/image.avif" type="image/avif">
  <source srcset="/image.webp" type="image/webp">
  <img src="/image.jpg" alt="描述" loading="lazy">
</picture>
```

### 2. 使用Astro Image组件

```astro
---
import { Image } from 'astro:assets';
import myImage from '@/assets/images/photo.jpg';
---

<Image 
  src={myImage}
  alt="描述"
  width={800}
  height={600}
  format="webp"
  quality={80}
  loading="lazy"
/>
```

### 3. 实施懒加载

```javascript
// 使用Intersection Observer
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.add('loaded');
      imageObserver.unobserve(img);
    }
  });
}, {
  rootMargin: '50px' // 提前50px开始加载
});

document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
```

---

## 🔍 性能监控

### Web Vitals监控

**安装**:
```bash
pnpm add web-vitals
```

**实施**: `src/utils/web-vitals.ts`

```typescript
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // 发送到分析服务
  if (navigator.sendBeacon) {
    const body = JSON.stringify(metric);
    navigator.sendBeacon('/api/analytics', body);
  }
}

// 监控所有Core Web Vitals
onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### Lighthouse CI

**配置**: `.lighthouserc.js`

```javascript
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: ['http://localhost:4321/']
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      }
    }
  }
};
```

---

## 📋 优化检查清单

### 关键渲染路径
- [ ] 内联关键CSS (< 14KB)
- [ ] 延迟加载非关键CSS
- [ ] 预连接关键域名
- [ ] 预加载关键资源
- [ ] 移除渲染阻塞脚本

### 资源优化
- [ ] 压缩和缩减CSS/JS
- [ ] 移除未使用的代码
- [ ] 实施代码分割
- [ ] 优化图片格式和大小
- [ ] 启用文本压缩(Gzip/Brotli)

### 加载策略
- [ ] 实施懒加载
- [ ] 使用资源提示(preload/prefetch)
- [ ] 优化字体加载
- [ ] 延迟第三方脚本
- [ ] 实施Service Worker缓存

### 运行时性能
- [ ] 消除强制重排
- [ ] 拆分长任务
- [ ] 使用passive事件监听器
- [ ] 优化动画性能
- [ ] 减少主线程工作

### Core Web Vitals
- [ ] LCP < 2.5秒
- [ ] FID < 100毫秒
- [ ] CLS < 0.1
- [ ] FCP < 1.8秒
- [ ] TTFB < 600毫秒

---

## 🎯 快速命令

```bash
# 开发环境
npm run dev

# 生产构建
npm run build

# 预览生产版本
npm run preview

# 运行Lighthouse
npx lighthouse http://localhost:4321 --view

# 分析bundle大小
npx vite-bundle-visualizer

# 检查未使用的CSS
npx purgecss --css dist/**/*.css --content dist/**/*.html
```

---

## 📚 相关文档

- [完整优化计划](LIGHTHOUSE_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [Astro配置](astro.config.mjs)
- [Layout组件](src/layouts/Layout.astro)
- [Service Worker](public/sw.js)

---

**最后更新**: 2025-10-25