
# 🚀 网站性能优化方案

> **基于 Lighthouse 性能评分: 57/100**  
> **目标: 提升至 90+ 分**

---

## 📊 当前性能指标

| 指标 | 当前值 | 目标值 | 优先级 |
|------|--------|--------|--------|
| **Performance Score** | 57 | 90+ | 🔴 高 |
| **FCP** (First Contentful Paint) | 3.7s | <1.8s | 🔴 高 |
| **LCP** (Largest Contentful Paint) | 5.4s | <2.5s | 🔴 高 |
| **TBT** (Total Blocking Time) | 0ms | <200ms | ✅ 良好 |
| **CLS** (Cumulative Layout Shift) | 0.013 | <0.1 | ✅ 良好 |
| **SI** (Speed Index) | 8.0s | <3.4s | 🔴 高 |
| **TTFB** (Time to First Byte) | 720ms | <600ms | 🟡 中 |

---

## 🔥 关键问题清单

### 1. 🔴 **Pagefind 搜索功能失败** (严重)

**问题描述:**
```
Failed to load Pagefind: Error: Pagefind script not found: 404
HEAD https://www.freebird2913.tech/pagefind/pagefind.js [404]
```

**影响:**
- 搜索功能完全无法使用
- 用户体验严重受损
- 控制台错误影响开发调试

**根本原因:**
1. `pagefind` 索引未在构建时正确生成
2. Vercel 部署时 `pagefind` 命令可能执行失败
3. `dist/pagefind/` 目录未被创建或上传

**解决方案:**

#### 方案 A: 修复构建流程 (推荐)

```json
// package.json
{
  "scripts": {
    "build": "astro build && pagefind --site dist --verbose",
    "build:vercel": "astro build && npx pagefind --site dist --bundle-dir dist/pagefind"
  }
}
```

#### 方案 B: 添加构建后验证

```javascript
// scripts/verify-build.js
import { existsSync } from 'fs';
import { join } from 'path';

const pagefindPath = join(process.cwd(), 'dist', 'pagefind', 'pagefind.js');

if (!existsSync(pagefindPath)) {
  console.error('❌ Pagefind 未成功构建!');
  process.exit(1);
}

console.log('✅ Pagefind 构建成功');
```

#### 方案 C: 优雅降级处理

```javascript
// 在 Layout.astro 或搜索组件中添加
async function loadPagefind() {
  try {
    const response = await fetch('/pagefind/pagefind.js', { method: 'HEAD' });
    if (response.ok) {
      await import('/pagefind/pagefind.js');
    } else {
      console.warn('Pagefind 未安装，搜索功能不可用');
      showSearchUnavailableMessage();
    }
  } catch (error) {
    console.error('Pagefind 加载失败:', error);
    showSearchUnavailableMessage();
  }
}
```

---

### 2. 🔴 **API 重定向问题** (严重)

**问题描述:**
```
GET /api/stats/total   → 308 Redirect
GET /api/stats/total/  → 200 OK

POST /api/views/{slug} → 308 Redirect
POST /api/views/{slug}/ → 200 OK
```

**影响:**
- 每个请求额外增加 1 次网络往返
- 增加 100-500ms 延迟
- 浪费服务器资源

**根本原因:**
Astro 配置中 `trailingSlash: "always"` 导致所有 URL 必须以 `/` 结尾

**解决方案:**

#### 方案 A: 统一 API 调用路径 (推荐)

```javascript
// public/scripts/page-analytics.js
const CONFIG = {
  API_BASE: "/api",
  // 确保所有 API 路径都以 / 结尾
  getEndpoint: (path) => `${CONFIG.API_BASE}${path}/`
};

// 修改所有 API 调用
async function fetchCurrentStats() {
  const response = await fetch(CONFIG.getEndpoint(`/stats/${state.slug}`));
  // ...
}

async function incrementViews() {
  const result = await apiRequest(CONFIG.getEndpoint(`/views/${state.slug}`));
  // ...
}
```

#### 方案 B: API 端点添加重写规则

```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/api/stats/total",
      "destination": "/api/stats/total/"
    },
    {
      "source": "/api/stats/:slug",
      "destination": "/api/stats/:slug/"
    },
    {
      "source": "/api/views/:slug",
      "destination": "/api/views/:slug/"
    },
    {
      "source": "/api/reads/:slug",
      "destination": "/api/reads/:slug/"
    }
  ]
}
```

---

### 3. 🟡 **图片资源优化** (中等)

**问题描述:**
```
GET /assets/images/banner.png → 404
Image corrupt or truncated
Largest Contentful Paint element: 5.4s
```

**影响:**
- Banner 图片加载失败
- LCP 时间过长 (5.4s)
- 布局偏移 (CLS)

**解决方案:**

#### 3.1 修复 Banner 图片路径

```typescript
// src/config.ts
export const siteConfig: SiteConfig = {
  banner: {
    enable: true,
    src: "assets/images/banner.png",  // ✅ 确认此路径存在
    position: "center",
  },
};
```

**验证命令:**
```bash
ls -la src/assets/images/banner.png
# 如果不存在，检查 public 目录
ls -la public/assets/images/banner.png
```

#### 3.2 使用 Astro 图片优化

```astro
---
// src/layouts/Layout.astro
import { Image } from 'astro:assets';
import bannerImage from '@/assets/images/banner.png';
---

<Image 
  src={bannerImage}
  alt="Site banner"
  loading="eager"
  fetchpriority="high"
  quality={85}
  format="webp"
  width={1200}
  height={400}
/>
```

#### 3.3 添加图片预加载

```astro
<!-- 在 <head> 中添加 -->
<link 
  rel="preload" 
  as="image" 
  href={bannerImage.src}
  fetchpriority="high"
/>
```

#### 3.4 响应式图片

```astro
<picture>
  <source
    media="(max-width: 768px)"
    srcset={mobileImage.src}
    type="image/webp"
  />
  <source
    media="(min-width: 769px)"
    srcset={desktopImage.src}
    type="image/webp"
  />
  <img src={bannerImage.src} alt="Banner" loading="eager" />
</picture>
```

---

### 4. 🟡 **JavaScript 模块加载失败** (中等)

**问题描述:**
```
来源为"/_astro/LightDarkSwitch.qJgQa8hn.js"的模块加载失败
来源为"/_astro/Search.qwgNpb8s.js"的模块加载失败
来源为"/_astro/DisplaySettings.C-WaoqF2.js"的模块加载失败
```

**影响:**
- 主题切换功能失效
- 搜索功能失效
- 显示设置功能失效

**根本原因:**
1. Vite 代码分割导致模块路径错误
2. 依赖关系循环导入
3. Vercel 部署时文件未正确上传

**解决方案:**

#### 4.1 优化 Vite 配置

```javascript
// astro.config.mjs
export default defineConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'svelte-components': [
              './src/components/LightDarkSwitch.svelte',
              './src/components/Search.svelte',
              './src/components/widget/DisplaySettings.svelte'
            ],
            'swup': ['@swup/astro'],
            'vendor': ['svelte', 'photoswipe'],
          },
          // 确保文件名稳定
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'entry/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
});
```

#### 4.2 添加错误边界

```typescript
// src/components/LightDarkSwitch.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  let componentReady = false;
  let error: Error | null = null;

  onMount(async () => {
    try {
      // 组件逻辑
      componentReady = true;
    } catch (e) {
      error = e as Error;
      console.error('组件初始化失败:', error);
    }
  });
</script>

{#if error}
  <div class="error-fallback">主题切换暂时不可用</div>
{:else if componentReady}
  <!-- 正常组件内容 -->
{:else}
  <div class="loading">加载中...</div>
{/if}
```

---

### 5. 🔴 **初始服务器响应慢** (高优先级)

**问题描述:**
- TTFB (Time to First Byte): 720ms
- Lighthouse 建议: < 600ms

**解决方案:**

#### 5.1 启用 Edge Functions

```typescript
// src/pages/[...page].astro
export const prerender = false;
export const config = {
  runtime: 'edge',
};
```

#### 5.2 优化 Redis 连接池

```typescript
// src/utils/redis-singleton.ts
let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: 5000,
      keepAlive: 5000,
    },
  });

  await redisClient.connect();
  return redisClient;
}
```

#### 5.3 实施增量静态再生成 (ISR)

```javascript
// astro.config.mjs
export default defineConfig({
  adapter: vercel({
    isr: {
      expiration: 60, // 60秒后重新生成
      bypassToken: process.env.REVALIDATE_TOKEN,
    },
  }),
});
```

---

### 6. 🟡 **未使用的 CSS** (中等)

**问题描述:**
- 未使用的 CSS: 23 KiB
- 可节省加载时间

**解决方案:**

#### 6.1 启用 PurgeCSS

```javascript
// tailwind.config.cjs
module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  safelist: [
    'dark',
    /^swup-/,
    /^transition-/,
  ],
};
```

#### 6.2 使用关键 CSS 内联

```astro
---
// src/layouts/Layout.astro
const criticalCSS = `
  /* 只包含首屏必需的 CSS */
  body { margin: 0; font-family: system-ui; }
  .navbar { /* ... */ }
`;
---

<style is:inline set:html={criticalCSS}></style>
```

#### 6.3 延迟加载非关键 CSS

```astro
<link 
  rel="preload" 
  href="/styles/non-critical.css" 
  as="style" 
  onload="this.onload=null;this.rel='stylesheet'"
/>
<noscript>
  <link rel="stylesheet" href="/styles/non-critical.css">
</noscript>
```

---

### 7. 🟢 **添加 CSP 安全策略**

**当前问题:**
```
请确保 CSP 能够有效地抵御 XSS 攻击
使用严格 HSTS 政策
确保通过 COOP 实现适当的源隔离
```

**解决方案:**

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://giscus.app https://www.clarity.ms https://fonts.googleapis.com https://api.iconify.design; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://giscus.app; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.iconify.design https://v1.hitokoto.cn; frame-src https://giscus.app;"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin-allow-popups"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "credentialless"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"

        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

### 8. 🟡 **第三方脚本优化**

**问题描述:**
```
Clarity分析工具错误: a[c] is not a function
第三方Cookie使用: 8个
```

**解决方案:**

#### 8.1 延迟加载 Clarity

```astro
<!-- src/layouts/Layout.astro -->
<script is:inline>
  // 延迟3秒加载Clarity，避免阻塞首屏
  setTimeout(() => {
    if (window.requestIdleCallback) {
      requestIdleCallback(() => {
        const script = document.createElement('script');
        script.src = 'https://www.clarity.ms/tag/tdtze87osu?ref=bwt';
        script.async = true;
        document.head.appendChild(script);
      });
    } else {
      const script = document.createElement('script');
      script.src = 'https://www.clarity.ms/tag/tdtze87osu?ref=bwt';
      script.async = true;
      document.head.appendChild(script);
    }
  }, 3000);
</script>
```

#### 8.2 Giscus 评论系统优化

```astro
<!-- 懒加载评论组件 -->
<div id="comments-placeholder">
  <button id="load-comments">加载评论</button>
</div>

<script>
  document.getElementById('load-comments')?.addEventListener('click', () => {
    // 动态加载 Giscus
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'acleverfreebird/fuwari');
    // ... 其他属性
    document.getElementById('comments-placeholder')?.appendChild(script);
  });
</script>
```

---

## 📅 实施计划

### 阶段 1: 紧急修复 (1-2天)

**优先级: 🔴 高**

- [ ] **修复 Pagefind 搜索功能**
  - 验证构建流程
  - 添加构建后检查
  - 实施优雅降级
  
- [ ] **修复 API 重定向问题**
  - 更新 `page-analytics.js` 中的所有 API 调用
  - 在 `vercel.json` 添加重写规则
  - 测试所有 API 端点

- [ ] **修复 Banner 图片404**
  - 检查图片路径
  - 实施图片预加载
  - 添加错误处理

**预期效果:**
- ✅ 搜索功能恢复正常
- ✅ API 响应时间减少 100-300ms
- ✅ 控制台错误清零

---

### 阶段 2: 性能优化 (3-5天)

**优先级: 🟡 中**

- [ ] **优化图片加载**
  - 实施响应式图片
  - 使用 WebP 格式
  - 添加图片懒加载
  
- [ ] **优化 JavaScript**
  - 修复模块加载错误
  - 优化代码分割
  - 添加错误边界

- [ ] **CSS 优化**
  - 移除未使用的 CSS
  - 内联关键 CSS
  - 延迟加载非关键 CSS

- [ ] **第三方脚本优化**
  - 延迟加载 Clarity
  - 懒加载评论系统
  - 优化字体加载

**预期效果:**
- 📈 FCP 从 3.7s → <2.0s
- 📈 LCP 从 5.4s → <2.5s
- 📈 SI 从 8.0s → <4.0s

---

### 阶段 3: 架构优化 (5-7天)

**优先级: 🟢 低**

- [ ] **服务器优化**
  - 启用 Edge Functions
  - 实施 Redis 连接池
  - 配置 ISR

- [ ] **安全加固**
  - 实施 CSP 策略
  - 添加 HSTS
  - 配置 COOP/COEP

- [ ] **缓存策略**
  - 优化 CDN 缓存
  - 实施 Service Worker
  - 配置浏览器缓存

**预期效果:**
- 📈 TTFB 从 720ms → <500ms
- 📈 整体性能评分 → 90+
- 🔒 安全评分提升

---

## 🧪 测试与验证

### 性能测试清单

```bash
# 1. Lighthouse 测试
npm run lighthouse

# 2. WebPageTest 测试
# 访问 https://www.webpagetest.org/
# 测试 URL: https://www.freebird2913.tech/

# 3. PageSpeed Insights
# 访问 https://pagespeed.web.dev/
# 测试 URL: https://www.freebird2913.tech/

# 4. 本地性能测试
npm run build
npm run preview
# 使用浏览器 DevTools 的 Performance 面板
```

### 功能测试清单

- [ ] 搜索功能正常工作
- [ ] 主题切换功能正常
- [ ] 评论系统正常加载
- [ ] 图片正确显示
- [ ] API 统计数据正确
- [ ] 所有页面路由正常
- [ ] 移动端显示正常

### 监控指标

**核心 Web 指标 (Core Web Vitals):**

| 指标 | 目标值 | 监控工具 |
|------|--------|----------|
| LCP | <2.5s | Vercel Analytics |
| FID | <100ms | Vercel Analytics |
| CLS | <0.1 | Vercel Analytics |
| FCP | <1.8s | Lighthouse CI |
| TTFB | <600ms | Vercel Analytics |

---

## 🔍 性能监控方案

### 1. 持续集成监控

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://www.freebird2913.tech/
            https://www.freebird2913.tech/posts/
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### 2. 实时性能监控

```typescript
// src/utils/performance-monitor.ts
export function reportWebVitals() {
  if (typeof window === 'undefined') return;

  // 监控 LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
    // 发送到分析服务
    sendToAnalytics('LCP', lastEntry.renderTime || lastEntry.loadTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // 监控 FID
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      console.log('FID:', entry.processingStart - entry.startTime);
      sendToAnalytics('FID', entry.processingStart - entry.startTime);
    });
  }).observe({ entryTypes: ['first-input'] });

  // 监控 CLS
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
        console.log('CLS:', clsValue);
        sendToAnalytics('CLS', clsValue);
      }
    }
  }).observe({ entryTypes: ['layout-shift'] });
}

function sendToAnalytics(metric: string, value: number) {
  // 发送到 Vercel Analytics 或自定义分析服务
  if (window.va) {
    window.va('track', 'Web Vitals', { metric, value });
  }
}
```

### 3. 错误监控

```typescript
// src/utils/error-monitor.ts
export function setupErrorMonitoring() {
  // 全局错误捕获
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    sendErrorToMonitoring({
      type: 'JavaScript Error',
      message: event.error?.message,
      stack: event.error?.stack,
      url: window.location.href,
    });
  });

  // Promise 错误捕获
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    sendErrorToMonitoring({
      type: 'Promise Rejection',
      message: event.reason?.message || String(event.reason),
      url: window.location.href,
    });
  });

  // 资源加载错误
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      console.error('Resource loading error:', event.target);
      sendErrorToMonitoring({
        type: 'Resource Error',
        resource: (event.target as any)?.src || (event.target as any)?.href,
        url: window.location.href,
      });
    }
  }, true);
}

function sendErrorToMonitoring(error: any) {
  // 发送到错误监控服务 (如 Sentry)
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(error),
  }).catch(console.error);
}
```

---

## 📊 性能优化检查清单

### 资源优化
- [ ] 图片使用 WebP/AVIF 格式
- [ ] 图片添加懒加载
- [ ] 字体使用 `font-display: swap`
- [ ] CSS 文件已压缩
- [ ] JavaScript 文件已压缩
- [ ] 移除未使用的代码

### 加载优化
- [ ] 关键资源添加 `preload`
- [ ] 非关键资源添加 `prefetch`
- [ ] 第三方脚本使用 `async` 或 `defer`
- [ ] 实施代码分割
- [ ] 使用动态导入

### 缓存优化
- [ ] 配置 CDN 缓存
- [ ] 设置合理的 Cache-Control
- [ ] 实施 Service Worker
- [ ] 使用 ISR/SSG

### 安全优化
- [ ] 配置 CSP 策略
- [ ] 启用 HTTPS
- [ ] 添加 HSTS
- [ ] 配置 CORS

### 监控优化
- [ ] 集成 Lighthouse CI
- [ ] 配置 Web Vitals 监控
- [ ] 设置错误监控
- [ ] 配置性能预算

---

## 🎯 预期成果

### 性能指标改善

| 指标 | 优化前 | 优化后 | 改善幅度 |
|------|--------|--------|----------|
| **Performance Score** | 57 | 90+ | +58% |
| **FCP** | 3.7s | <1.8s | -51% |
| **LCP** | 5.4s | <2.5s | -54% |
| **SI** | 8.0s | <3.4s | -58% |
| **TTFB** | 720ms | <500ms | -31% |

### 用户体验改善

- ✅ 页面加载速度提升 **50%+**
- ✅ 搜索功能恢复正常使用
- ✅ 控制台错误清零
- ✅ 安全性显著提升
- ✅ SEO 排名改善

### 技术债务清理

- ✅ 修复所有 404 错误
- ✅ 修复模块加载问题
- ✅ 优化 API 调用
- ✅ 规范代码结构
- ✅ 完善监控体系

---

## 📚 相关资源

### 官方文档
- [Astro 性能优化](https://docs.astro.build/en/guides/performance/)
- [Vercel 性能最佳实践](https://vercel.com/docs/concepts/limits/overview)
- [Web.dev 性能指南](https://web.dev/performance/)
- [Pagefind 文档](https://pagefind.app/)

### 工具
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [WebPageTest](https://www.webpagetest.org/)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

### 学习资源
- [Core Web Vitals](https://web.dev/vitals/)
- [JavaScript 性能优化](https://developers.google.com/web/fundamentals/performance/optimizing-javascript)
- [图片优化指南](https://web.dev/fast/#optimize-your-images)

---

## 🚀 下一步行动

### 立即执行
1. **修复 Pagefind 搜索** - 恢复核心功能
2. **修复 API 重定向** - 减少延迟
3. **修复图片 404** - 改善用户体验

### 本周完成
4. 优化图片加载策略
5. 修复 JavaScript 模块问题
6. 清理未使用的 CSS

### 长期优化
7. 实施完整的 CSP 策略
8. 配置性能监控系统
9. 建立持续集成检查

---

## 💡 总结

本优化方案针对当前网站的性能瓶颈,提供了系统化的解决方案。通过分阶段实施,预计可将 **Lighthouse 