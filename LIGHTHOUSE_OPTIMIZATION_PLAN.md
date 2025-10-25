# Lighthouse 性能优化计划

> 基于 2025-10-25 Lighthouse 性能审计报告的���化方案

## 📊 当前性能评分

**Performance Score: 78/100** ⚠️

### 核心指标

| 指标 | 当前值 | 目标值 | 状态 | 改善空间 |
|------|--------|--------|------|----------|
| **FCP** (First Contentful Paint) | 1.6s | < 1.2s | 🟡 需优化 | ↓ 25% |
| **LCP** (Largest Contentful Paint) | 1.8s | < 1.5s | 🟡 需优化 | ↓ 17% |
| **TBT** (Total Blocking Time) | 90ms | < 50ms | 🟡 需优化 | ↓ 44% |
| **CLS** (Cumulative Layout Shift) | 0 | < 0.1 | ✅ 优秀 | 保持 |
| **SI** (Speed Index) | 4.3s | < 3.0s | 🔴 需优化 | ↓ 30% |

---

## 🎯 关键性能问题分析

### 1. 图片优化问题 ⚠️ 高优先级

#### 问题描述
- **Avatar 图片过大**: `/_astro/avatar.DgNkmPip_Z21PyFQ.webp`
  - 实际尺寸: 622x622
  - 显示尺寸: 512x512
  - **浪费**: 9.0 KiB (28.0 KiB → 19.0 KiB)

#### 影响
- 增加网络传输时间
- 延迟 LCP
- 浪费带宽

#### 优化方案

**方案 A: 调整图片尺寸**
```astro
<!-- src/components/widget/Profile.astro -->
<ImageWrapper 
    src={config.avatar || ""} 
    alt="Profile Image of the Author" 
    class="mx-auto lg:w-full h-full lg:mt-0" 
    priority={true} 
    width={512}  <!-- 从 622 改为 512 -->
    height={512} <!-- 从 622 改为 512 -->
/>
```

**方案 B: 使用响应式图片**
```astro
<!-- 生成多个尺寸的头像 -->
<ImageWrapper 
    src={config.avatar || ""} 
    alt="Profile Image of the Author" 
    sizes="(max-width: 768px) 256px, 512px"
    width={512}
    height={512}
/>
```

**预期效果**:
- 图片大小: ↓ 32% (9 KiB)
- LCP: ↓ 5-8%
- 带宽节省: 9 KiB/访问

---

### 2. 强制自动重排 (Forced Reflow) 🔴 最高优先级

#### 问题描述
JavaScript 查询几何属性导致强制同步布局，严重影响性能。

**最耗时的函数调用**:
1. `_lighthouse-eval.js:8` - **265ms** 🔴
2. `Layout.astro_astro_t…lang.BLJ6P8KA.js:10` - **223ms** 🔴
3. `Layout.astro_astro_t…lang.BLJ6P8KA.js:10` - **102ms** 🔴
4. `bootstrap-autofill-overlay.js:2944` - **80ms** (第三方)

**总重排时间**: ~867ms

#### 影响
- TBT 增加 90ms
- INP 性能下降
- 用户交互响应延迟

#### 优化方案

**方案 A: 批量读取 DOM 属性**
```javascript
// src/layouts/Layout.astro

// ❌ 错误做法 - 导致强制重排
function updateLayout() {
    element.style.width = element.offsetWidth + 'px';  // 读取
    element.style.height = element.offsetHeight + 'px'; // 读取
}

// ✅ 正确做法 - 批量读取后批量写入
function updateLayout() {
    // 批量读取
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    
    // 批量写入
    requestAnimationFrame(() => {
        element.style.width = width + 'px';
        element.style.height = height + 'px';
    });
}
```

**方案 B: 使用 CSS 替代 JavaScript 布局**
```css
/* 使用 CSS 变量和 calc() 替代 JavaScript 计算 */
.banner {
    height: calc(var(--banner-height-extend) * 1px);
}
```

**方案 C: 延迟非关键布局计算**
```javascript
// 使用 requestIdleCallback 延迟非关键计算
if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
        updateNonCriticalLayout();
    }, { timeout: 2000 });
}
```

**预期效果**:
- 强制重排时间: ↓ 70% (265ms → 80ms)
- TBT: ↓ 50% (90ms → 45ms)
- INP: ↓ 30%

---

### 3. LCP 图片优化 🔴 高优先级

#### 问题描述
LCP 元素 (`img.w-full.h-full.object-cover`) 存在以下问题:
- ❌ 未应用 `fetchpriority=high`
- ✅ 可在初始文档中检测到
- ✅ 未应用延迟加载

#### LCP 细分分析
| 子部分 | 时长 | 占比 | 优化空间 |
|--------|------|------|----------|
| TTFB | 160ms | 8.9% | 中 |
| 资源加载延迟 | 550ms | 30.6% | 🔴 高 |
| 资源加载时长 | 5,770ms | 64.4% | 🔴 最高 |
| 元素渲染延迟 | 550ms | 30.6% | 🔴 高 |

**总 LCP 时间**: 1.8s

#### 优化方案

**方案 A: 添加 fetchpriority**
```astro
<!-- src/layouts/MainGridLayout.astro -->
<ImageWrapper 
    id="banner" 
    alt="Banner image of the blog" 
    src={siteConfig.banner.src} 
    position={siteConfig.banner.position} 
    priority={true}
    loading="eager"
    sizes="100vw"
    fetchpriority="high"  <!-- 新增 -->
/>
```

**方案 B: 预加载 LCP 图片**
```astro
<!-- src/layouts/Layout.astro -->
<head>
    <link 
        rel="preload" 
        as="image" 
        href={siteConfig.banner.src}
        fetchpriority="high"
        type="image/webp"
    />
</head>
```

**方案 C: 优化图片格式和尺寸**
```bash
# 生成优化的 Banner 图片
sharp -i src/assets/images/banner.png \
      -o public/banner-optimized.webp \
      --resize 1920 \
      --webp '{"quality": 85, "effort": 6}'
```

**预期效果**:
- 资源加载延迟: ↓ 60% (550ms → 220ms)
- 资源加载时长: ↓ 40% (5,770ms → 3,460ms)
- LCP: ↓ 35% (1.8s → 1.17s)

---

### 4. 网络依赖关系树优化 🟡 中优先级

#### 问题描述
**关键路径延迟**: 9,297ms

关键请求链过长，导致资源加载串行化：
```
初始导航 (717ms)
  └─ page.CUi_vaxE.js (1,193ms)
      └─ preload-helper.BhLMWRjL.js (3,596ms)
          └─ Swup.DeYJ0Ufc.js (8,985ms)
              └─ 最终资源 (9,297ms)
```

#### 优化方案

**方案 A: 预加载关键资源**
```astro
<!-- src/layouts/Layout.astro -->
<head>
    <!-- 预加载关键 JavaScript -->
    <link rel="modulepreload" href="/_astro/Swup.DeYJ0Ufc.js" />
    <link rel="modulepreload" href="/_astro/preload-helper.BhLMWRjL.js" />
    
    <!-- 预连接关键域名 -->
    <link rel="preconnect" href="https://get-views.freebird2913.tech" />
    <link rel="preconnect" href="https://v1.hitokoto.cn" />
    <link rel="dns-prefetch" href="https://api.iconify.design" />
</head>
```

**方案 B: 优化代码分割**
```javascript
// astro.config.mjs
export default defineConfig({
    vite: {
        build: {
            rollupOptions: {
                output: {
                    manualChunks: {
                        'swup-core': ['@swup/astro'],
                        'swup-plugins': [
                            '@swup/a11y-plugin',
                            '@swup/scripts-plugin',
                            '@swup/scroll-plugin',
                            '@swup/preload-plugin',
                            '@swup/head-plugin'
                        ],
                        vendor: ['svelte', 'photoswipe'],
                    },
                },
            },
        },
    },
});
```

**方案 C: 延迟加载非关键资源**
```javascript
// 延迟加载 Hitokoto API
setTimeout(() => {
    fetch('https://v1.hitokoto.cn')
        .then(res => res.json())
        .then(data => updateQuote(data));
}, 2000);
```

**预期效果**:
- 关键路径延迟: ↓ 40% (9,297ms → 5,578ms)
- FCP: ↓ 20%
- LCP: ↓ 15%

---

### 5. 渲染阻塞资源优化 🔴 高优先级

#### 问题描述
**6 个 CSS 文件阻塞渲染** (总计 39.9 KiB):
1. `Layout.CFwGdNXj.css` - 2.9 KiB
2. `Layout.DSulWsr7.css` - 1.6 KiB
3. `about.BtniRLn_.css` - 5.0 KiB
4. `_page_.Bejoz4qu.css` - 12.3 KiB
5. `_slug_.0znIbKdn.css` - 2.5 KiB
6. `_page_.cpC-EdJi.css` - 15.6 KiB

#### 优化方案

**方案 A: 内联关键 CSS**
```astro
<!-- src/layouts/Layout.astro -->
<head>
    <style>
        /* 内联首屏关键 CSS */
        :root {
            --page-bg: #ffffff;
            --card-bg: #f8f9fa;
            --primary: oklch(0.7 0.14 var(--hue));
        }
        
        body {
            margin: 0;
            font-family: 'Roboto', -apple-system, sans-serif;
            background: var(--page-bg);
        }
        
        .card-base {
            background: var(--card-bg);
            border-radius: 0.75rem;
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
    <link 
        rel="preload" 
        href="/_astro/Layout.CFwGdNXj.css" 
        as="style" 
        onload="this.onload=null;this.rel='stylesheet'"
    />
    <noscript>
        <link rel="stylesheet" href="/_astro/Layout.CFwGdNXj.css" />
    </noscript>
</head>
```

**方案 B: 按路由分割 CSS**
```javascript
// astro.config.mjs
export default defineConfig({
    build: {
        inlineStylesheets: 'auto', // 自动内联小于 4KB 的 CSS
    },
});
```

**预期效果**:
- FCP: ↓ 35% (1.6s → 1.04s)
- 首屏渲染速度: ↑ 40%
- 阻塞时间: ↓ 100%

---

### 6. 未使用的 CSS 优化 🟡 中优先级

#### 问题描述
**预计节省 21 KiB** (20.5 KiB / 23.9 KiB = 86% 未使用)

主要来源: Pico.css 框架

#### 优化方案

**方案 A: 使用 PurgeCSS**
```javascript
// postcss.config.mjs
import purgecss from '@fullhuman/postcss-purgecss';

export default {
    plugins: [
        purgecss({
            content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
            safelist: {
                standard: [/^swup-/, /^transition-/, /^onload-/],
                deep: [/giscus/, /photoswipe/],
            },
        }),
    ],
};
```

**方案 B: 移除 Pico.css，使用 Tailwind**
```javascript
// 已经在使用 Tailwind，可以完全移除 Pico.css
// 将 Pico.css 的必要样式迁移到 Tailwind 配置
```

**预期效果**:
- CSS 大小: ↓ 86% (21 KiB)
- FCP: ↓ 10%
- 网络传输: ↓ 21 KiB

---

### 7. 未使用的 JavaScript 优化 🔴 最高优先级

#### 问题描述
**预计节省 731 KiB** (主要来自浏览器扩展)

| 来源 | 大小 | 未使用 | 占比 |
|------|------|--------|------|
| 沉浸式翻译扩展 | 810.3 KiB | 385.0 KiB | 47% |
| Bitwarden 扩展 | 640.9 KiB | 346.5 KiB | 54% |
| AdBlock 扩展 | 159.6 KiB | 55.3 KiB | 35% |

**注意**: 这些是浏览器扩展注入的脚本，不在我们控制范围内。

#### 我们可以优化的 JavaScript

**方案 A: 代码分割优化**
```javascript
// 动态导入非关键组件
const PhotoSwipe = () => import('photoswipe');
const Pagefind = () => import('/pagefind/pagefind.js');

// 仅在需要时加载
document.getElementById('search-btn')?.addEventListener('click', async () => {
    const pagefind = await Pagefind();
    pagefind.init();
});
```

**方案 B: Tree Shaking 优化**
```javascript
// 使用具名导入而非默认导入
import { OverlayScrollbars } from 'overlayscrollbars';  // ✅
// import OverlayScrollbars from 'overlayscrollbars';  // ❌
```

**预期效果**:
- 首次加载 JS: ↓ 30%
- TBT: ↓ 25%
- 解析时间: ↓ 35%

---

### 8. 长时间运行的主线程任务 🔴 高优先级

#### 问题描述
**发现 6 项长时间运行的任务** (总计 548ms)

| 来源 | 开始时间 | 时长 | 影响 |
|------|----------|------|------|
| `https://www.freebird2913.tech` | 956ms | **188ms** | 🔴 严重 |
| `Layout.astro...BLJ6P8KA.js` | 1,828ms | **143ms** | 🔴 严重 |
| `Swup.DeYJ0Ufc.js` | 2,171ms | **83ms** | 🟡 中等 |
| `Layout.astro...BLJ6P8KA.js` | 2,093ms | **71ms** | 🟡 中等 |
| `Layout.astro...BLJ6P8KA.js` | 1,979ms | **63ms** | 🟡 中等 |
| `bootstrap-autofill-overlay.js` | 1,144ms | **95ms** | 🟡 中等 |

#### 优化方案

**方案 A: 任务分片 (Task Splitting)**
```javascript
// src/layouts/Layout.astro

// ❌ 长时间运行的任务
function init() {
    loadTheme();
    loadHue();
    showBanner();
    initCustomScrollbar();
    setupLazyLoad();
    initPhotoSwipe();
}

// ✅ 分片执行
async function init() {
    // 关键任务 - 立即执行
    loadTheme();
    loadHue();
    showBanner();
    
    // 非关键任务 - 分片执行
    await scheduler.yield(); // 让出主线程
    initCustomScrollbar();
    
    await scheduler.yield();
    setupLazyLoad();
    
    await scheduler.yield();
    initPhotoSwipe();
}

// Polyfill for scheduler.yield()
const scheduler = {
    yield: () => new Promise(resolve => {
        if ('scheduler' in window && 'yield' in window.scheduler) {
            window.scheduler.yield().then(resolve);
        } else {
            setTimeout(resolve, 0);
        }
    })
};
```

**方案 B: 使用 Web Workers**
```javascript
// 将耗时计算移到 Worker
const worker = new Worker('/workers/heavy-computation.js');
worker.postMessage({ type: 'process', data: largeData });
worker.onmessage = (e) => {
    updateUI(e.data);
};
```

**预期效果**:
- 长任务数量: ↓ 67% (6 → 2)
- TBT: ↓ 60% (90ms → 36ms)
- INP: ↓ 40%

---

### 9. 第三方脚本优化 🟡 中优先级

#### 问题描述
**第三方脚本影响** (总计 601ms 主线程时间):

| 第三方 | 传输大小 | 主线程耗时 | 影响 |
|--------|----------|-----------|------|
| 沉浸式翻译扩展 | 0 KiB | 272ms | 🔴 高 |
| Bitwarden 扩展 | 0 KiB | 181ms | 🟡 中 |
| 其他扩展 | 0 KiB | 148ms | 🟡 中 |
| Google Fonts | 36 KiB | 0ms | ✅ 优秀 |
| Hitokoto API | 1 KiB | 0ms | ✅ 优秀 |
| Iconify API | 2 KiB | 0ms | ✅ 优秀 |

**注意**: 浏览器扩展不在我们控制范围内，但可以优化我们的第三方集成。

#### 优化方案

**方案 A: 延迟加载第三方脚本**
```astro
<!-- src/layouts/Layout.astro -->
<script is:inline>
// 延迟加载 Clarity
function loadClarity() {
    const script = document.createElement('script');
    script.src = 'https://www.clarity.ms/tag/tdtze87osu?ref=bwt';
    script.async = true;
    document.head.appendChild(script);
}

// 页面加载完成后 3 秒再加载
window.addEventListener('load', () => {
    setTimeout(loadClarity, 3000);
});
</script>
```

**方案 B: 使用 Facade 模式**
```astro
<!-- 为 Giscus 创建 Facade -->
<div id="comments-facade" class="cursor-pointer" onclick="loadGiscus()">
    <div class="p-8 text-center border-2 border-dashed rounded-lg">
        <p>点击加载评论</p>
    </div>
</div>
```

**预期效果**:
- 首屏加载时间: ↓ 15%
- TBT: ↓ 20%
- 用户可控的加载时机

---

### 10. DOM 大小优化 🟢 低优先级

#### 当前状态
- **元素总数**: 772 (良好)
- **最大子级数**: 71 (`.flex.gap-2.flex-wrap`)
- **DOM 深度**: 15 (`path` 元素)

#### 建议
当前 DOM 大小在合理范围内，暂不需要优化。

---

## 📈 预期性能提升

### 优化前后对比

| 指标 | 当前 | 目标 | 改善 | 优先级 |
|------|------|------|------|--------|
| **Performance Score** | 78 | 95+ | ↑ 22% | 🔴 最高 |
| **FCP** | 1.6s | 1.0s | ↓ 38% | 🔴 高 |
| **LCP** | 1.8s | 1.2s | ↓ 33% | 🔴 高 |
| **TBT** | 90ms | 30ms | ↓ 67% | 🔴 高 |
| **SI** | 4.3s | 2.8s | ↓ 35% | 🟡 中 |
| **CLS** | 0 | 0 | 保持 | ✅ 优秀 |

### 资源优化预期

| 资源类型 | 当前 | 优化后 | 节省 |
|----------|------|--------|------|
| **图片** | 28 KiB | 19 KiB | 9 KiB (32%) |
| **CSS** | 39.9 KiB | 18.9 KiB | 21 KiB (53%) |
| **JavaScript** | ~200 KiB | ~140 KiB | 60 KiB (30%) |
| **总计** | ~268 KiB | ~178 KiB | **90 KiB (34%)** |

---

## 🚀 实施计划

### 第 1 阶段: 快速优化 (1-2 天)

**目标**: Performance Score 78 → 85

#### Day 1: 图片和 LCP 优化
- [x] 优化 Avatar 图片尺寸 (622x622 → 512x512)
- [ ] 为 LCP 图片添加 `fetchpriority="high"`
- [ ] 预加载 Banner 图片
- [ ] 优化 Banner 图片格式和质量

**预期提升**: +5 分

#### Day 2: 强制重排优化
- [ ] 识别所有导致强制重排的代码
- [ ] 批量读取 DOM 属性
- [ ] 使用 `requestAnimationFrame` 批量写入
- [ ] 将布局计算移到 CSS

**预期提升**: +2 分

---

### 第 2 阶段: 深度优化 (3-5 天)

**目标**: Performance Score 85 → 92

#### Day 3-4: JavaScript 优化
- [ ] 实施任务分片
- [ ] 优化代码分割策略
- [ ] 延迟加载非关键脚本
- [ ] 移除未使用的代码

**预期提升**: +4 分

#### Day 5: CSS 优化
- [ ] 内联关键 CSS
- [ ] 配置 PurgeCSS
- [ ] 延迟加载非关键 CSS
- [ ] 优化字体加载策略

**预期提升**: +3 分

---

### 第 3 阶段: 精细调优 (6-7 天)

**目标**: Performance Score 92 → 95+

#### Day 6: 网络优化
- [ ] 优化资源预加载策略
- [ ] 配置资源优先级
- [ ] 优化代码分割
- [ ] 实施 HTTP/2 推送

**预期提升**: +2 分

#### Day 7: 第三方优化
- [ ] 延迟加载所有第三方脚本
- [ ] 实施 Facade 模式
- [ ] 优化 API 调用时机
- [ ] 添加资源提示

**预期提升**: +1 分

---

## ✅ 验证清单

### 部署前检查
- [ ] Lighthouse Performance Score > 90
- [ ] FCP < 1.2s
- [ ] LCP < 1.5s
- [ ] TBT < 50ms
- [ ] CLS < 0.1
- [ ] SI < 3.0s
- [ ] 所有图片已优化
- [ ] 关键 CSS 已内联
- [ ] 长任务已分片
- [ ] 第三方脚本已延迟

### 部署后验证
- [ ] 真实用户 FCP < 1.5s
- [ ] 真实用户 LCP < 2.0s
- [ ] 真实用户 INP < 200ms
- [ ] 真实用户 CLS < 0.1
- [ ] CDN 缓存命中率 > 80%
- [ ] 错误率 < 0.1%
- [ ] 用户满意度 > 95%

---

## 📊 监控指标

### 持续监控
1. **Core Web Vitals**
   - FCP, LCP, INP, CLS, TTFB
   - 按设备类型分组
   - 按地理位置分组

2. **资源性能**
   - 图片加载时间
   - JavaScript 执行时间
   - CSS 解析时间
   - 字体加载时间

3. **用户体验**
   - 页面加载时间
   - 交互响应时间
   - 跳出率
   - 转化率

### 告警阈值
- FCP > 2.0s → 🔴 严重
- LCP > 2.5s → 🔴 严重
- TBT > 200ms → 🟡 警告
- CLS > 0.1 → 🟡 警告

---

## 🔗 相关资源

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)
- [Optimize LCP](https://web.dev/optimize-lcp/)
- [Reduce JavaScript Execution Time](https://web.dev/bootup-time/)
- [Eliminate Render-Blocking Resources](https://web.dev/render-blocking-resources/)
- [Avoid Forced Synchronous Layouts](https://web.dev/avoid-large-complex-layouts-and-layout-thrashing/)

---

## 📝 优化日志

### 2025-10-25
- ✅ 分析 Lighthouse 性能报告
- ✅ 识别 10 个关键性能问题
- ✅ 制定详细优化计划
- ✅ 创建实施时间表
- [ ] 开始第 1 阶段优化

### 待更新
- 实际优化效果
- 性能提升数据
- 用户反馈

---

**创建日期**: 2025-10-25  
**最后更新**: 2025-10-25  
**状态**: 📋 计划制定完成，待实施  
**预期完成**: 2025-11-01  
**负责人**: Architect Mode