# Speed Insights 性能优化综合方案

> 基于 2025-10-19 Speed Insights 报告的全面性能优化计划

## 📊 当前性能诊断

### 整体评分
- **Real Experience Score (RES)**: 88分 ⚠️ **需要改进**
- **目标**: 提升至 90+ 分（优秀）

### 核心 Web Vitals 指标

| 指标 | 当前值 | 目标值 | 状态 | 优先级 |
|------|--------|--------|------|--------|
| **FCP** (首次内容绘制) | 2.4s | < 1.8s | ⚠️ 需优化 | 🔴 高 |
| **LCP** (最大内容绘制) | 3.06s | < 2.5s | ⚠️ 需优化 | 🔴 高 |
| **INP** (交互延迟) | 224ms | < 200ms | ⚠️ 需优化 | 🟡 中 |
| **CLS** (累积布局偏移) | 0.01 | < 0.1 | ✅ 优秀 | 🟢 低 |
| **FID** (首次输入延迟) | 4ms | < 100ms | ✅ 优秀 | 🟢 低 |
| **TTFB** (首字节时间) | 0.74s | < 0.6s | 🟡 良好 | 🟡 中 |

### 路由性能分析

#### 🔴 严重问题路由

**1. `/archive` - RES: 66分 (差)**
- 访问量: 43次
- 问题: 性能最差的页面
- 影响: 用户体验差，可能导致跳出率高
- 优化潜力: **34分提升空间**

**2. `/posts/[slug]` - RES: 87分 (需改进)**
- 访问量: 190次 (最高流量)
- 问题: 核心内容页面性能不佳
- 影响: 直接影响用户阅读体验
- 优化潜力: **13分提升空间**

#### 🟢 良好路由

**3. `/` (首页) - RES: 99分 (优秀)**
- 访问量: 44次
- 状态: 性能优秀，保持现状

**4. `/friends` - RES: 99分 (优秀)**
- 访问量: 12次
- 状态: 性能优秀

**5. `/[page]` (分页) - RES: 100分 (完美)**
- 访问量: 6次
- 状态: 性能完美

### 地理位置性能分析

| 地区 | 访问量 | RES | 状态 | 优化优先级 |
|------|--------|-----|------|-----------|
| 🇸🇬 新加坡 | 126 (42%) | 74 | ⚠️ 差 | 🔴 最高 |
| 🇨🇳 中国 | 95 (31%) | 89 | 🟡 需改进 | 🟡 高 |
| 🇺🇸 美国 | 18 (6%) | 72 | ⚠️ 差 | 🟡 中 |
| 🇯🇵 日本 | 13 (4%) | 80 | 🟡 需改进 | 🟢 低 |

**关键发现**:
- 73%的流量来自新加坡和中国
- 新加坡是最大流量来源但性能最差
- 需要针对亚太地区优化 CDN 配置

---

## 🎯 优化策略

### 阶段一: 紧急优化 (1-2周) - 目标 RES: 90+

#### 1. 优化 `/archive` 路由 (RES: 66 → 90+)

**问题诊断**:
```typescript
// src/pages/archive.astro
const sortedPostsList = await getSortedPostsList();  // 可能加载所有文章数据
```

**优化方案**:

##### 1.1 实施虚拟滚动
```typescript
// src/components/ArchivePanel.svelte
// 当前: 一次性渲染所有文章
// 优化: 使用虚拟滚动，只渲染可见区域

<script>
  import { onMount } from 'svelte';
  
  export let sortedPosts = [];
  
  let visiblePosts = [];
  let itemHeight = 80; // 每个文章项高度
  let containerHeight = 600;
  let scrollTop = 0;
  
  $: {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 5,
      sortedPosts.length
    );
    visiblePosts = sortedPosts.slice(startIndex, endIndex);
  }
</script>

<div 
  class="archive-container" 
  style="height: {containerHeight}px; overflow-y: auto;"
  on:scroll={(e) => scrollTop = e.target.scrollTop}
>
  <div style="height: {sortedPosts.length * itemHeight}px; position: relative;">
    {#each visiblePosts as post, i}
      <div style="position: absolute; top: {(startIndex + i) * itemHeight}px;">
        <!-- 文章项内容 -->
      </div>
    {/each}
  </div>
</div>
```

##### 1.2 数据分页加载
```typescript
// src/pages/archive.astro
---
import ArchivePanel from "@components/ArchivePanel.svelte";
import { getSortedPostsList } from "../utils/content-utils";

// 优化: 只加载必要的元数据，不加载完整内容
const sortedPostsList = await getSortedPostsList();
const lightweightPosts = sortedPostsList.map(post => ({
  slug: post.slug,
  title: post.data.title,
  published: post.data.published,
  category: post.data.category,
  tags: post.data.tags?.slice(0, 3), // 只保留前3个标签
}));
---

<ArchivePanel sortedPosts={lightweightPosts} client:load></ArchivePanel>
```

##### 1.3 添加骨架屏
```svelte
<!-- src/components/ArchivePanel.svelte -->
<script>
  let isLoading = true;
  
  onMount(() => {
    // 模拟数据加载
    setTimeout(() => isLoading = false, 100);
  });
</script>

{#if isLoading}
  <div class="skeleton-container">
    {#each Array(10) as _, i}
      <div class="skeleton-item animate-pulse">
        <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    {/each}
  </div>
{:else}
  <!-- 实际内容 -->
{/if}
```

**预期效果**:
- LCP: 3.5s → 2.0s (↓ 43%)
- FCP: 2.8s → 1.5s (↓ 46%)
- RES: 66 → 92+ (↑ 39%)

---

#### 2. 优化 `/posts/[slug]` 路由 (RES: 87 → 95+)

**问题诊断**:
```astro
<!-- src/pages/posts/[...slug].astro -->
<!-- 问题1: Giscus 评论系统阻塞渲染 -->
<script is:inline src="https://giscus.app/client.js" ...></script>

<!-- 问题2: 图片未优化 -->
<ImageWrapper src={entry.data.image} priority={true}/>
```

**优化方案**:

##### 2.1 延迟加载评论系统
```astro
<!-- 优化后: 使用 Intersection Observer 延迟加载 -->
<div id="comments-container" class="card-base p-6 rounded-[var(--radius-large)] mb-4">
  <div id="giscus-placeholder" class="min-h-[200px] flex items-center justify-center">
    <button id="load-comments" class="btn-primary">
      加载评论
    </button>
  </div>
</div>

<script>
  function loadGiscus() {
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'acleverfreebird/fuwari');
    script.setAttribute('data-repo-id', 'R_kgDOPbwShw');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDOPbwSh84CuH7J');
    script.setAttribute('data-mapping', 'og:title');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    
    const placeholder = document.getElementById('giscus-placeholder');
    placeholder.innerHTML = '';
    placeholder.appendChild(script);
  }

  // 方案1: 用户点击加载
  document.getElementById('load-comments')?.addEventListener('click', loadGiscus);

  // 方案2: 滚动到评论区域自动加载
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadGiscus();
        observer.disconnect();
      }
    });
  }, { rootMargin: '200px' });

  const commentsContainer = document.getElementById('comments-container');
  if (commentsContainer) {
    observer.observe(commentsContainer);
  }
</script>
```

##### 2.2 优化图片加载策略
```astro
<!-- src/pages/posts/[...slug].astro -->
{entry.data.image && (
  <ImageWrapper 
    id="post-cover" 
    src={entry.data.image} 
    basePath={path.join("content/posts/", getDir(entry.id))} 
    class="mb-8 rounded-xl banner-container onload-animation"
    priority={false}  <!-- 改为 false，使用懒加载 -->
    loading="lazy"
    decoding="async"
    fetchpriority="low"  <!-- 降低优先级 -->
  />
)}
```

##### 2.3 预连接关键资源
```astro
<!-- 在 <head> 中添加 -->
<link slot="head" rel="preconnect" href="https://giscus.app" />
<link slot="head" rel="dns-prefetch" href="https://giscus.app" />
```

##### 2.4 优化代码块渲染
```typescript
// astro.config.mjs
export default defineConfig({
  integrations: [
    expressiveCode({
      // 添加代码块懒加载
      themes: [expressiveCodeConfig.theme],
      plugins: [
        pluginCodeBlockCollapse({ 
          collapseAfter: 15,  // 从20行降低到15行
          defaultCollapsed: true  // 默认折叠
        }),
        // ... 其他插件
      ],
    }),
  ],
});
```

**预期效果**:
- LCP: 3.2s → 2.3s (↓ 28%)
- INP: 240ms → 180ms (↓ 25%)
- RES: 87 → 95+ (↑ 9%)

---

### 阶段二: 全局性能优化 (2-4周) - 目标 RES: 93+

#### 3. 优化 LCP (3.06s → 2.0s)

##### 3.1 优化 Banner 图片
```astro
<!-- src/layouts/Layout.astro -->
<!-- 当前问题: Banner 图片可能过大 -->

<!-- 优化方案 -->
<script>
  // 1. 使用响应式图片
  const banner = document.getElementById('banner');
  if (banner) {
    const img = banner.querySelector('img');
    if (img) {
      // 根据设备宽度加载不同尺寸
      const width = window.innerWidth;
      let bannerSrc;
      
      if (width < 768) {
        bannerSrc = '/_astro/banner-mobile.webp';  // 移动端: 800px
      } else if (width < 1200) {
        bannerSrc = '/_astro/banner-tablet.webp';  // 平板: 1200px
      } else {
        bannerSrc = '/_astro/banner-desktop.webp'; // 桌面: 1920px
      }
      
      img.src = bannerSrc;
    }
  }
</script>
```

##### 3.2 图片格式优化
```bash
# 使用 sharp 批量转换图片为 WebP
npm install sharp-cli -g

# 转换 banner 图片
sharp -i src/assets/images/banner.png \
      -o public/_astro/banner-mobile.webp \
      --resize 800 \
      --webp '{"quality": 85}'

sharp -i src/assets/images/banner.png \
      -o public/_astro/banner-tablet.webp \
      --resize 1200 \
      --webp '{"quality": 85}'

sharp -i src/assets/images/banner.png \
      -o public/_astro/banner-desktop.webp \
      --resize 1920 \
      --webp '{"quality": 80}'
```

##### 3.3 关键资源预加载优化
```astro
<!-- src/components/PerformanceOptimization.astro -->
<!-- 当前: 预加载可能不存在的资源 -->
<link rel="preload" href="/_astro/banner.png" as="image" />

<!-- 优化: 只预加载关键资源 -->
<link rel="preload" href="/_astro/banner-desktop.webp" as="image" type="image/webp" media="(min-width: 1200px)" />
<link rel="preload" href="/_astro/banner-tablet.webp" as="image" type="image/webp" media="(min-width: 768px) and (max-width: 1199px)" />
<link rel="preload" href="/_astro/banner-mobile.webp" as="image" type="image/webp" media="(max-width: 767px)" />

<!-- 预加载关键 CSS -->
<link rel="preload" href="/_astro/main.css" as="style" />

<!-- 预连接字体 CDN -->
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

**预期效果**:
- LCP: 3.06s → 2.0s (↓ 35%)
- 图片加载时间: ↓ 60%

---

#### 4. 优化 FCP (2.4s → 1.6s)

##### 4.1 内联关键 CSS
```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  build: {
    inlineStylesheets: 'always',  // 从 'auto' 改为 'always'
  },
  vite: {
    build: {
      cssCodeSplit: true,  // 启用 CSS 代码分割
    },
  },
});
```

##### 4.2 提取关键 CSS
```html
<!-- src/layouts/Layout.astro -->
<head>
  <!-- 内联关键 CSS -->
  <style>
    /* 关键渲染路径 CSS */
    body {
      margin: 0;
      font-family: 'Roboto', sans-serif;
      background: var(--page-bg);
    }
    
    .card-base {
      background: var(--card-bg);
      border-radius: var(--radius-large);
    }
    
    /* 骨架屏样式 */
    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  </style>
  
  <!-- 延迟加载非关键 CSS -->
  <link rel="preload" href="/_astro/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/_astro/main.css" /></noscript>
</head>
```

##### 4.3 优化字体加载
```astro
<!-- src/layouts/Layout.astro -->
<head>
  <!-- 优化字体加载策略 -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  
  <!-- 使用 font-display: swap 避免 FOIT -->
  <link 
    rel="stylesheet" 
    href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" 
    media="print" 
    onload="this.media='all'" 
  />
  <noscript>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" />
  </noscript>
</head>

<style>
  /* 字体加载期间使用系统字体 */
  body {
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 'Helvetica Neue', Arial, sans-serif;
  }
</style>
```

**预期效果**:
- FCP: 2.4s → 1.6s (↓ 33%)
- 首屏渲染速度提升 40%

---

#### 5. 优化 INP (224ms → 180ms)

##### 5.1 优化 JavaScript 执行
```typescript
// src/layouts/Layout.astro
<script>
  // 当前: 同步执行可能阻塞主线程
  function initCustomScrollbar() {
    // ... 大量 DOM 操作
  }
  
  // 优化: 使用 requestIdleCallback 延迟非关键初始化
  function init() {
    loadTheme();
    loadHue();
    showBanner();
    
    // 延迟初始化滚动条
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        initCustomScrollbar();
      }, { timeout: 2000 });
    } else {
      setTimeout(initCustomScrollbar, 100);
    }
  }
</script>
```

##### 5.2 优化事件监听器
```typescript
// src/layouts/Layout.astro
<script>
  // 当前: 频繁的滚动事件可能导致性能问题
  window.onscroll = scrollFunction;
  
  // 优化: 使用节流
  function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  window.onscroll = throttle(scrollFunction, 100);  // 100ms 节流
</script>
```

##### 5.3 优化 Svelte 组件
```svelte
<!-- src/components/ArchivePanel.svelte -->
<script>
  import { onMount, tick } from 'svelte';
  
  export let sortedPosts = [];
  
  // 使用虚拟列表减少 DOM 节点
  let visibleRange = { start: 0, end: 20 };
  
  // 优化: 批量更新 DOM
  async function updateVisibleRange(newRange) {
    visibleRange = newRange;
    await tick();  // 等待 DOM 更新完成
  }
  
  // 使用 IntersectionObserver 而不是 scroll 事件
  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // 处理可见性变化
      },
      { rootMargin: '100px' }
    );
    
    return () => observer.disconnect();
  });
</script>
```

**预期效果**:
- INP: 224ms → 180ms (↓ 20%)
- 交互响应速度提升 25%

---

### 阶段三: CDN 和地理优化 (3-5周) - 目标 RES: 95+

#### 6. 优化亚太地区性能

##### 6.1 Vercel Edge Network 配置
```json
// vercel.json
{
  "regions": [
    "sin1",  // 新加坡 (主要流量)
    "hkg1",  // 香港 (中国大陆邻近)
    "nrt1",  // 东京 (日本)
    "sfo1",  // 旧金山 (美国西海岸)
    "iad1"   // 华盛顿 (美国东海岸)
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=31536000, stale-while-revalidate=86400"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/_astro/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/api/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=60, stale-while-revalidate=300"
        }
      ]
    }
  ]
}
```

##### 6.2 使用 Cloudflare CDN 加速静态资源
```typescript
// 创建 cloudflare-worker/static-assets-proxy.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 缓存策略
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    
    // 尝试从缓存获取
    let response = await cache.match(cacheKey);
    
    if (!response) {
      // 从源站获取
      response = await fetch(request);
      
      // 只缓存成功的响应
      if (response.ok) {
        // 克隆响应以便缓存
        const responseToCache = response.clone();
        
        // 设置缓存头
        const headers = new Headers(responseToCache.headers);
        headers.set('Cache-Control', 'public, max-age=31536000');
        headers.set('CDN-Cache-Control', 'public, max-age=31536000');
        
        const cachedResponse = new Response(responseToCache.body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: headers
        });
        
        // 异步缓存
        await cache.put(cacheKey, cachedResponse);
      }
    }
    
    return response;
  }
};
```

##### 6.3 优化 Umami Analytics 加载
```astro
<!-- src/components/UmamiAnalytics.astro -->
---
import { umamiConfig } from '@/config';
---

{umamiConfig.enable && (
  <script 
    defer  <!-- 使用 defer 而不是 async -->
    data-website-id={umamiConfig.websiteId}
    data-domains={umamiConfig.domains}
    data-auto-track={umamiConfig.autoTrack}
  >
    // 延迟加载 Umami
    (function() {
      const loadUmami = () => {
        const script = document.createElement('script');
        script.src = '{umamiConfig.src}';
        script.defer = true;
        script.setAttribute('data-website-id', '{umamiConfig.websiteId}');
        script.setAttribute('data-domains', '{umamiConfig.domains}');
        script.setAttribute('data-auto-track', '{umamiConfig.autoTrack}');
        document.head.appendChild(script);
      };
      
      // 页面加载完成后延迟加载
      if (document.readyState === 'complete') {
        setTimeout(loadUmami, {umamiConfig.delayLoad || 2000});
      } else {
        window.addEventListener('load', () => {
          setTimeout(loadUmami, {umamiConfig.delayLoad || 2000});
        });
      }
    })();
  </script>
)}
```

**预期效果**:
- 新加坡 RES: 74 → 90+ (↑ 22%)
- 中国 RES: 89 → 95+ (↑ 7%)
- TTFB: 0.74s → 0.5s (↓ 32%)

---

### 阶段四: 高级优化 (持续优化)

#### 7. 实施 Service Worker 缓存策略

```javascript
// public/sw.js
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// 需要预缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/offline/',
  '/_astro/main.css',
  '/_astro/banner-desktop.webp',
];

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('static-') || name.startsWith('dynamic-') || name.startsWith('images-'))
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch 事件 - 缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') return;

  // 跳过 Chrome 扩展请求
  if (url.protocol === 'chrome-extension:') return;

  // API 请求 - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // 图片请求 - Cache First
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 静态资源 - Cache First
  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML 页面 - Network First with Cache Fallback
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // 其他请求 - Network First
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// Cache First 策略
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

// Network First 策略
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // 如果是 HTML 请求且缓存未命中，返回离线页面
    if (request.destination === 'document') {
      return cache.match('/offline/');
    }
    
    throw error;
  }
}
```

##### 7.1 注册 Service Worker
```astro
<!-- src/layouts/Layout.astro -->
<script>
  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker 注册成功:', registration.scope);
          
          // 检查更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 新版本可用，提示用户刷新
                if (confirm('发现新版本，是否刷新页面？')) {
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker 注册失败:', error);
        });
    });
  }
</script>
```

**预期效果**:
- 重复访问速度提升 70%
- 离线访问支持
- 减少服务器请求 50%

---

#### 8. 实施资源优先级优化

```astro
<!-- src/layouts/Layout.astro -->
<head>
  <!-- 关键资源 - 最高优先级 -->
  <link rel="preload" href="/_astro/main.css" as="style" fetchpriority="high" />
  <link rel="preload" href="/_astro/banner-desktop.webp" as="image" fetchpriority="high" />
  
  <!-- 字体 - 高优先级 -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link 
    rel="preload" 
    href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" 
    as="style" 
    fetchpriority="high"
  />
  
  <!-- 分析脚本 - 低优先级 -->
  <link rel="preconnect" href="https://views.freebird2913.tech" />
  <link rel="dns-prefetch" href="https://www.clarity.ms" />
  
  <!-- 第三方资源 - 最低优先级 -->
  <link rel="preconnect" href="https://giscus.app" fetchpriority="low" />
</head>

<body>
  <!-- 关键内容 - 高优先级 -->
  <img src="/banner.webp" fetchpriority="high" loading="eager" />
  
  <!-- 非关键图片 - 低优先级 -->
  <img src="/avatar.webp" fetchpriority="low" loading="lazy" />
</body>
```

---

## 📈 预期性能提升总览

### 核心指标改善

| 指标 | 当前 | 目标 | 改善幅度 |
|------|------|------|----------|
| **RES** | 88 | 95+ | ↑ 8% |
| **FCP** | 2.4s | 1.6s | ↓ 33% |
| **LCP** | 3.06s | 2.0s | ↓ 35% |
| **INP** | 224ms | 180ms | ↓ 20% |
| **TTFB** | 0.74s | 0.5s | ↓ 32% |

### 路由性能改善

| 路由 | 当前 RES | 目标 RES | 改善 |
|------|----------|----------|------|
| `/archive` | 66 | 92+ | ↑ 39% |
| `/posts/[slug]` | 87 | 95+ | ↑ 9% |
| `/` | 99 | 99 | 保持 |

### 地理位置改善

| 地区 | 当前 RES | 目标 RES | 改善 |
|------|----------|----------|------|
| 新加坡 | 74 | 90+ | ↑ 22% |
| 中国 | 89 | 95+ | ↑ 7% |
| 美国 | 72 | 88+ | ↑ 22% |
| 日本 | 80 | 92+ | ↑ 15% |

---

## 🔍 监控和验证

### 性能监控工具

#### 1. 实时监控
```typescript
// src/components/PerformanceMonitor.astro
<script>
  // Web Vitals 监控
  import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals';

  function sendToAnalytics(metric) {
    // 发送到 Umami 或其他分析服务
    if (window.umami) {
      window.umami.track('web-vitals', {
        metric: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,
      });
    }
    
    console.log(`📊 ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    });
  }

  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onFID(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
</script>
```

#### 2. Lighthouse CI 集成
```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI
on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://www.freebird2913.tech/
            https://www.freebird2913.tech/archive/
            https://www.freebird2913.tech/posts/first/
          uploadArtifacts: true
          temporaryPublicStorage: true
```

#### 3. 性能预算
```json
// lighthouse-budget.json
{
  "budgets": [
    {
      "path": "/*",
      "timings": [
        {
          "metric": "first-contentful-paint",
          "budget": 1800
        },
        {
          "metric": "largest-contentful-paint",
          "budget": 2500
        },
        {
          "metric": "interactive",
          "budget": 3800
        }
      ],
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 300
        },
        {
          "resourceType": "stylesheet",
          "budget": 100
        },
        {
          "resourceType": "image",
          "budget": 500
        },
        {
          "resourceType": "total",
          "budget": 1000
        }
      ]
    }
  ]
}
```

---

## 🚀 实施时间表

### 第 1-2 周: 紧急优化
- [x] 优化 `/archive` 路由
  - [ ] 实施虚拟滚动
  - [ ] 数据分页加载
  - [ ] 添加骨架屏
- [x] 优化 `/posts/[slug]` 路由
  - [ ] 延迟加载评论系统
  - [ ] 优化图片加载
  - [ ] 优化代码块渲染

**里程碑**: RES 提升至 90+

### 第 3-4 周: 全局优化
- [ ] 优化 LCP
  - [ ] Banner 图片优化
  - [ ] 响应式图片
  - [ ] 关键资源预加载
- [ ] 优化 FCP
  - [ ] 内联关键 CSS
  - [ ] 优化字体加载
- [ ] 优化 INP
  - [ ] JavaScript 执行优化
  - [ ] 事件监听器优化

**里程碑**: RES 提升至 93+

### 第 5-6 周: CDN 优化
- [ ] Vercel Edge Network 配置
- [ ] Cloudflare CDN 集成
- [ ] 优化 Analytics 加载

**里程碑**: 亚太地区 RES 提升至 90+

### 第 7-8 周: 高级优化
- [ ] Service Worker 实施
- [ ] 资源优先级优化
- [ ] 性能监控集成

**里程碑**: 整体 RES 提升至 95+

---

## ✅ 验证清单

### 部署前检查
- [ ] 所有图片已转换为 WebP 格式
- [ ] 关键 CSS 已内联
- [ ] Service Worker 已注册
- [ ] 性能监控已配置
- [ ] Lighthouse 评分 > 90

### 部署后验证
- [ ] 所有路由 RES > 90
- [ ] FCP < 1.8s
- [ ] LCP < 2.5s
- [ ] INP < 200ms
- [ ] TTFB < 0.6s
- [ ] 新加坡 RES > 90
- [ ] 中国 RES > 95

---

## 📚 参考资源

- [Web Vitals](https://web.dev/vitals/)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Resource Hints](https://www.w3.org/TR/resource-hints/)

---

**创建日期**: 2025-10-19  
**最后更新**: 2025-10-19  
**状态**: 📋 待审核 → 准备实施