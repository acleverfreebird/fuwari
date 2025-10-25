# Speed Insights 性能优化方案 (2025-10-25)

> 基于最新 Speed Insights 数据的针对性优化计划

## 📊 当前性能诊断

### 整体评分
- **Real Experience Score (RES)**: 81分 ⚠️ **需要改进**
- **目标**: 提升至 90+ 分（优秀）
- **改善空间**: 9分 (11% 提升)

### 核心 Web Vitals 指标

| 指标 | 当前值 | 目标值 | 状态 | 优先级 | 改善幅度 |
|------|--------|--------|------|--------|----------|
| **FCP** (首次内容绘制) | 2.64s | < 1.8s | 🔴 需优化 | 高 | ↓ 32% |
| **LCP** (最大内容绘制) | 3.46s | < 2.5s | 🔴 需优化 | 高 | ↓ 28% |
| **INP** (交互延迟) | 280ms | < 200ms | 🔴 需优化 | 高 | ↓ 29% |
| **CLS** (累积布局偏移) | 0 | < 0.1 | ✅ 优秀 | 低 | 保持 |
| **FID** (首次输入延迟) | 4ms | < 100ms | ✅ 优秀 | 低 | 保持 |
| **TTFB** (首字节时间) | 1.05s | < 0.6s | 🔴 需优化 | 高 | ↓ 43% |

### 路由性能分析（按优先级排序）

#### 🔴 严重问题路由

**1. `/posts/[slug]` - RES: 76分**
- **访问量**: 120次（最高流量，占40%）
- **问题**: 核心内容页面性能差，直接影响用户阅读体验
- **优化潜力**: **14分提升空间** (18% 改善)
- **关键问题**:
  - Giscus 评论系统阻塞渲染
  - 文章封面图片加载慢
  - 代码块初始渲染过多
  - JavaScript 执行时间长

**2. `/friends` - RES: 72分**
- **访问量**: 9次
- **问题**: 性能最差的页面
- **优化潜力**: **18分提升空间** (25% 改善)
- **关键问题**:
  - 友链卡片一次性渲染
  - 头像图片未优化
  - 缺少懒加载机制

#### 🟡 需改进路由

**3. `/` (首页) - RES: 83分**
- **访问量**: 44次
- **问题**: 首页是用户第一印象，需要达到优秀水平
- **优化潜力**: **12分提升空间** (14% 改善)
- **关键问题**:
  - Banner 图片加载慢
  - 首屏内容过多
  - 字体加载阻塞渲染

**4. `/about` - RES: 84分**
- **访问量**: 6次
- **优化潜力**: **11分提升空间** (13% 改善)

#### ✅ 优秀路由

**5. `/archive` - RES: 93分**
- **访问量**: 60次
- **状态**: 已优化良好（虚拟滚动、骨架屏、懒加载）
- **保持现状**: 作为其他页面优化的参考标准

---

## 🎯 优化策略

### 阶段一: 紧急优化 (1-2周) - 目标 RES: 85+

#### 1. 优化 `/posts/[slug]` 路由 (最高优先级)

##### 1.1 优化 Giscus 评论加载
**当前问题**:
```javascript
// 评论系统在页面加载时立即加载，阻塞渲染
<script src="https://giscus.app/client.js" ...></script>
```

**优化方案**:
```javascript
// 1. 延迟加载 - 滚动到评论区域时才加载
// 2. 用户主动触发 - 点击按钮加载
// 3. 预连接优化 - 提前建立连接但不加载脚本

// 已实现但需要优化的部分:
- 减少 rootMargin 从 200px 到 100px
- 增加延迟时间从 500ms 到 1000ms
- 添加加载状态指示器
```

**预期效果**:
- LCP: 3.5s → 2.8s (↓ 20%)
- INP: 300ms → 220ms (↓ 27%)
- RES: 76 → 85+ (↑ 12%)

##### 1.2 优化文章封面图片
**当前问题**:
```astro
<!-- priority={false} 但仍然使用 eager loading -->
<ImageWrapper
    src={entry.data.image}
    priority={false}
/>
```

**优化方案**:
```astro
<!-- 1. 明确使用 lazy loading -->
<ImageWrapper
    src={entry.data.image}
    loading="lazy"
    priority={false}
    fetchpriority="low"
/>

<!-- 2. 使用响应式图片 -->
<ImageWrapper
    src={entry.data.image}
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
    loading="lazy"
/>

<!-- 3. 添加占位符防止 CLS -->
<div class="aspect-video bg-gray-200 dark:bg-gray-800">
    <ImageWrapper ... />
</div>
```

**预期效果**:
- LCP: 3.5s → 2.5s (↓ 29%)
- FCP: 2.8s → 2.2s (↓ 21%)

##### 1.3 优化代码块渲染
**当前问题**:
```javascript
// astro.config.mjs
pluginCodeBlockCollapse({ collapseAfter: 20 })
// 20行以上才折叠，初始渲染过多
```

**优化方案**:
```javascript
// 1. 降低折叠阈值
pluginCodeBlockCollapse({ 
    collapseAfter: 15,  // 从 20 降到 15
    defaultCollapsed: true  // 默认折叠
})

// 2. 延迟高亮非可见代码块
// 3. 使用虚拟滚动处理长代码
```

**预期效果**:
- INP: 280ms → 200ms (↓ 29%)
- JavaScript 执行时间: ↓ 35%

---

#### 2. 优化核心 Web Vitals

##### 2.1 减少 FCP (2.64s → 1.6s)

**优化方案 A: 内联关键 CSS**
```astro
<!-- src/layouts/Layout.astro -->
<head>
    <style>
        /* 内联关键 CSS - 首屏渲染必需 */
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
    </style>
    
    <!-- 延迟加载非关键 CSS -->
    <link rel="preload" href="/_astro/main.css" as="style" 
          onload="this.onload=null;this.rel='stylesheet'" />
    <noscript><link rel="stylesheet" href="/_astro/main.css" /></noscript>
</head>
```

**优化方案 B: 优化字体加载**
```astro
<head>
    <!-- 1. 预连接字体 CDN -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    
    <!-- 2. 使用 font-display: swap -->
    <link rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
          media="print" 
          onload="this.media='all'" />
    
    <!-- 3. 系统字体回退 -->
    <style>
        body {
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 
                         'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        }
    </style>
</head>
```

**预期效果**:
- FCP: 2.64s → 1.6s (↓ 39%)
- 首屏渲染速度提升 45%

##### 2.2 减少 LCP (3.46s → 2.0s)

**优化方案 A: Banner 图片优化**
```bash
# 1. 转换为 WebP 格式
npm install sharp-cli -g

# 2. 生成响应式图片
sharp -i src/assets/images/banner.png \
      -o public/banner-mobile.webp \
      --resize 800 \
      --webp '{"quality": 85}'

sharp -i src/assets/images/banner.png \
      -o public/banner-tablet.webp \
      --resize 1200 \
      --webp '{"quality": 85}'

sharp -i src/assets/images/banner.png \
      -o public/banner-desktop.webp \
      --resize 1920 \
      --webp '{"quality": 80}'
```

**优化方案 B: 响应式图片加载**
```astro
<!-- src/layouts/MainGridLayout.astro -->
<picture>
    <source srcset="/banner-mobile.webp" 
            media="(max-width: 768px)" 
            type="image/webp">
    <source srcset="/banner-tablet.webp" 
            media="(max-width: 1200px)" 
            type="image/webp">
    <source srcset="/banner-desktop.webp" 
            media="(min-width: 1201px)" 
            type="image/webp">
    <img src="/banner-desktop.webp" 
         alt="Banner" 
         loading="eager"
         fetchpriority="high"
         decoding="async">
</picture>
```

**优化方案 C: 关键资源预加载**
```astro
<head>
    <!-- 只预加载当前设备需要的 Banner -->
    <link rel="preload" 
          href="/banner-desktop.webp" 
          as="image" 
          type="image/webp"
          media="(min-width: 1201px)"
          fetchpriority="high">
    
    <link rel="preload" 
          href="/banner-tablet.webp" 
          as="image" 
          type="image/webp"
          media="(min-width: 769px) and (max-width: 1200px)"
          fetchpriority="high">
    
    <link rel="preload" 
          href="/banner-mobile.webp" 
          as="image" 
          type="image/webp"
          media="(max-width: 768px)"
          fetchpriority="high">
</head>
```

**预期效果**:
- LCP: 3.46s → 2.0s (↓ 42%)
- 图片加载时间: ↓ 65%
- 带宽节省: ↓ 70%

##### 2.3 减少 INP (280ms → 180ms)

**优化方案 A: JavaScript 执行优化**
```javascript
// src/layouts/Layout.astro
<script>
    // 当前: 同步执行可能阻塞主线程
    function init() {
        loadTheme();
        loadHue();
        showBanner();
        initCustomScrollbar();  // 阻塞
    }
    
    // 优化: 使用 requestIdleCallback 延迟非关键初始化
    function init() {
        // 关键初始化 - 立即执行
        loadTheme();
        loadHue();
        showBanner();
        
        // 非关键初始化 - 延迟执行
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                initCustomScrollbar();
                setupLazyLoad();
            }, { timeout: 2000 });
        } else {
            setTimeout(() => {
                initCustomScrollbar();
                setupLazyLoad();
            }, 100);
        }
    }
</script>
```

**优化方案 B: 事件监听器节流**
```javascript
// 优化滚动事件
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

// 应用节流
window.addEventListener('scroll', throttle(scrollFunction, 100));
```

**预期效果**:
- INP: 280ms → 180ms (↓ 36%)
- 交互响应速度提升 40%

##### 2.4 减少 TTFB (1.05s → 0.6s)

**优化方案: 增强 CDN 缓存**
```json
// vercel.json
{
    "regions": ["sin1", "hkg1", "nrt1", "sfo1", "iad1"],
    "headers": [
        {
            "source": "/:path*.html",
            "headers": [
                {
                    "key": "Cache-Control",
                    "value": "public, max-age=0, must-revalidate"
                },
                {
                    "key": "CDN-Cache-Control",
                    "value": "public, s-maxage=7200, stale-while-revalidate=86400"
                }
            ]
        },
        {
            "source": "/_astro/:path*",
            "headers": [
                {
                    "key": "Cache-Control",
                    "value": "public, max-age=31536000, immutable"
                },
                {
                    "key": "CDN-Cache-Control",
                    "value": "public, max-age=31536000, immutable"
                }
            ]
        }
    ]
}
```

**预期效果**:
- TTFB: 1.05s → 0.6s (↓ 43%)
- 缓存命中率: ↑ 60%

---

### 阶段二: 全面优化 (2-3周) - 目标 RES: 90+

#### 3. 优化其他路由

##### 3.1 优化 `/friends` 路由 (RES: 72 → 90+)

**优化方案**:
```svelte
<!-- src/pages/friends.astro -->
<script>
    import { onMount } from 'svelte';
    
    let visibleFriends = [];
    let allFriends = [...friends];
    
    onMount(() => {
        // 初始只显示前 6 个友链
        visibleFriends = allFriends.slice(0, 6);
        
        // 使用 Intersection Observer 懒加载剩余友链
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && visibleFriends.length < allFriends.length) {
                    const nextBatch = allFriends.slice(
                        visibleFriends.length,
                        visibleFriends.length + 6
                    );
                    visibleFriends = [...visibleFriends, ...nextBatch];
                }
            });
        }, { rootMargin: '200px' });
        
        const container = document.getElementById('friends-container');
        if (container) observer.observe(container);
    });
</script>

<!-- 友链卡片懒加载头像 -->
<img 
    src={friend.avatar} 
    alt={friend.name}
    loading="lazy"
    decoding="async"
    fetchpriority="low"
/>
```

**预期效果**:
- RES: 72 → 92+ (↑ 28%)
- LCP: ↓ 45%
- INP: ↓ 35%

##### 3.2 优化首页 `/` (RES: 83 → 95+)

**优化方案**:
```astro
<!-- src/pages/index.astro -->
---
// 1. 只加载首屏文章
const recentPosts = await getSortedPosts();
const firstPagePosts = recentPosts.slice(0, 6);
---

<!-- 2. 延迟加载非首屏内容 -->
<div class="posts-container">
    {firstPagePosts.map(post => (
        <PostCard post={post} loading="eager" />
    ))}
</div>

<!-- 3. 懒加载更多文章 -->
<div id="more-posts" class="hidden">
    {recentPosts.slice(6).map(post => (
        <PostCard post={post} loading="lazy" />
    ))}
</div>

<script>
    // 滚动到底部时显示更多文章
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.getElementById('more-posts').classList.remove('hidden');
                observer.disconnect();
            }
        });
    });
    
    const postsContainer = document.querySelector('.posts-container');
    if (postsContainer) observer.observe(postsContainer);
</script>
```

**预期效果**:
- RES: 83 → 95+ (↑ 14%)
- FCP: ↓ 30%
- LCP: ↓ 25%

---

#### 4. 实施高级优化

##### 4.1 Service Worker 缓存策略

**创建 public/sw.js**:
```javascript
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// 预缓存静态资源
const STATIC_ASSETS = [
    '/',
    '/offline/',
    '/_astro/main.css',
    '/banner-desktop.webp',
];

// 安装事件
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
                    .filter((name) => name.startsWith('static-') || 
                                     name.startsWith('dynamic-') || 
                                     name.startsWith('images-'))
                    .filter((name) => name !== STATIC_CACHE && 
                                     name !== DYNAMIC_CACHE && 
                                     name !== IMAGE_CACHE)
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

**注册 Service Worker**:
```astro
<!-- src/layouts/Layout.astro -->
<script>
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('✅ Service Worker 注册成功:', registration.scope);
                    
                    // 检查更新
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && 
                                navigator.serviceWorker.controller) {
                                // 新版本可用
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

##### 4.2 资源优先级优化

```astro
<!-- src/layouts/Layout.astro -->
<head>
    <!-- 关键资源 - 最高优先级 -->
    <link rel="preload" href="/_astro/main.css" as="style" fetchpriority="high" />
    <link rel="preload" href="/banner-desktop.webp" as="image" fetchpriority="high" />
    
    <!-- 字体 - 高优先级 -->
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" 
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" 
          as="style" 
          fetchpriority="high" />
    
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

| 指标 | 当前 | 目标 | 改善幅度 | 实施难度 |
|------|------|------|----------|----------|
| **RES** | 81 | 95+ | ↑ 17% | 中 |
| **FCP** | 2.64s | 1.6s | ↓ 39% | 中 |
| **LCP** | 3.46s | 2.0s | ↓ 42% | 高 |
| **INP** | 280ms | 180ms | ↓ 36% | 中 |
| **TTFB** | 1.05s | 0.6s | ↓ 43% | 低 |

### 路由性能改善

| 路由 | 当前 RES | 目标 RES | 改善 | 优先级 |
|------|----------|----------|------|--------|
| `/posts/[slug]` | 76 | 90+ | ↑ 18% | 🔴 最高 |
| `/friends` | 72 | 92+ | ↑ 28% | 🔴 高 |
| `/` | 83 | 95+ | ↑ 14% | 🟡 中 |
| `/about` | 84 | 95+ | ↑ 13% | 🟡 中 |
| `/archive` | 93 | 93 | 保持 | 🟢 低 |

---

## 🚀 实施时间表

### 第 1 周: 紧急优化
- **Day 1-2**: 优化 `/posts/[slug]` 路由
  - [ ] 优化 Giscus 评论加载
  - [ ] 优化文章封面图片
  - [ ] 优化代码块渲染
- **Day 3-4**: 优化核心 Web Vitals
  - [ ] 减少 FCP (内联 CSS、优化字体)
  - [ ] 减少 LCP (Banner 图片优化)
- **Day 5**: 测试和验证
  - [ ] Lighthouse 测试
  - [ ] Speed Insights 验证

**里程碑**: RES 提升至 85+

### 第 2 周: 全面优化
- **Day 1-2**: 优化其他路由
  - [ ] `/friends` 路由优化
  - [ ] 首页优化
- **Day 3-4**: 高级优化
  - [ ] Service Worker 实施
  - [ ] 资源优先级优化
- **Day 5**: 性能监控集成
  - [ ] Web Vitals 监控
  - [ ] Lighthouse CI 配置

**里程碑**: RES 提升至 90+

### 第 3 周: 精细调优
- **Day 1-3**: 性能微调
  - [ ] 优化 INP
  - [ ] 优化 TTFB
  - [ ] CDN 缓存优化
- **Day 4-5**: 文档和总结
  - [ ] 性能优化文档
  - [ ] 最佳实践总结

**最终目标**: RES 提升至 95+

---

## ✅ 验证清单

### 部署前检查
- [ ] 所有图片已转换为 WebP 格式
- [ ] 关键 CSS 已内联
- [ ] Service Worker 已注册
- [ ] 性能监控已配置
- [ ] Lighthouse 评分 > 90
- [ ] 所有路由 RES > 85

### 部署后验证
- [ ] 所有路由 RES > 90
- [ ] FCP < 1.8s
- [ ] LCP < 2.5s
- [ ] INP < 200ms
- [ ] TTFB < 0.6s
- [ ] CLS < 0.1
- [ ] 缓存命中率 > 60%

---

## 📚 参考资源

- [Web Vitals](https://web.dev/vitals/)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Resource Hints](https://www.w3.org/TR/resource-hints/)
- [Image Optimization](https://web.dev/fast/#optimize-your-images)

---

**创建日期**: 2025-10-25  
**最后更新**: 2025-10-25  
**状态**: 📋 准备实施
**预期完成**: 2025-11-15