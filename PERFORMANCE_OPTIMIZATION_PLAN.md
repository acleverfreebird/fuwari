# 网站性能优化方案

## 🎯 优化目标
- 解决资源404错误
- 提升首屏加载速度
- 修复搜索功能
- 优化资源加载策略
- 改善用户体验

---

## 📊 问题诊断

### 1. 关键资源缺失 (Critical)
**问题:**
- ❌ Roboto字体文件404: `/fonts/roboto/files/roboto-latin-*.woff2`
- ❌ Banner图片路径不匹配: `/assets/images/banner.png`
- ❌ Pagefind搜索脚本404: `/pagefind/pagefind.js`

**影响:**
- 字体加载失败导致FOUT(Flash of Unstyled Text)
- 预加载失败消耗带宽
- 搜索功能完全无法使用

### 2. JavaScript模块加载失败 (Critical)
**现象:**
```
NS_BINDING_ABORTED:
- SwupA11yPlugin.B0fTfpSW.js
- SwupScrollPlugin.t9jexBOd.js
- SwupPreloadPlugin.CiyJa6X8.js
- SwupHeadPlugin.d6nb3Z__.js
- SwupScriptsPlugin.CRD5-C2F.js
```

**可能原因:**
- Swup配置问题
- 构建时代码分割错误
- CDN缓存策略不当

### 3. 性能瓶颈 (High)
- Banner图片加载时间31.6秒
- API响应延迟
- 第三方脚本阻塞渲染
- CSS解析错误导致重绘

### 4. CSS错误 (Medium)
- 未知属性和伪类
- 解析错误导致样式失效
- 可能影响布局渲染性能

---

## 🔧 解决方案

### 阶段1: 修复关键错误 (Priority: Critical)

#### 1.1 字体加载策略优化
**当前问题:**
```html
<!-- 预加载不存在的本地字体 -->
<link rel="preload" href="/fonts/roboto/files/roboto-latin-400-normal.woff2">
```

**解决方案A: 使用Google Fonts CDN (推荐)**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" 
      href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" 
      as="style" 
      onload="this.onload=null;this.rel='stylesheet'">
```

**优点:**
- ✅ 利用全球CDN加速
- ✅ 自动字体子集化
- ✅ 浏览器缓存共享
- ✅ 减少构建复杂度

**解决方案B: 自托管字体**
```javascript
// 1. 创建字体目录结构
public/
  fonts/
    roboto/
      roboto-latin-400-normal.woff2
      roboto-latin-500-normal.woff2
      roboto-latin-700-normal.woff2

// 2. 配置CSS
@font-face {
  font-family: 'Roboto';
  src: url('/fonts/roboto/roboto-latin-400-normal.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

**推荐: 方案A**,因为项目已使用Google Fonts,切换成本低且性能更好。

#### 1.2 修复Pagefind搜索
**问题根源:**
```bash
# 构建命令缺少pagefind生成步骤
npm run build  # 只构建Astro,未生成pagefind索引
```

**解决方案:**
```json
// package.json
{
  "scripts": {
    "build": "astro build && pagefind --site dist",
    "build:vercel": "astro build && pagefind --site dist"
  }
}
```

**验证pagefind配置:**
```yaml
# pagefind.yml
site: dist
glob: "**/*.html"
exclude_selectors:
  - "span.katex"
  - "[data-pagefind-ignore]"
```

#### 1.3 Banner图片优化
**当前问题:**
- 图片使用PNG格式,文件过大
- 预加载路径与实际构建路径不匹配

**解决方案:**
```typescript
// 1. 转换为WebP格式
src/assets/images/banner.png → banner.webp

// 2. 响应式图片
<picture>
  <source srcset="/banner-small.webp" media="(max-width: 768px)">
  <source srcset="/banner-medium.webp" media="(max-width: 1200px)">
  <img src="/banner-large.webp" alt="Banner">
</picture>

// 3. 使用Astro Image优化
---
import { Image } from 'astro:assets';
import banner from '@assets/images/banner.png';
---
<Image src={banner} alt="Banner" width={1920} height={600} format="webp" quality={80} />
```

**预期效果:**
- 🎯 减少70%文件大小
- 🎯 加载时间从31秒降至<3秒

---

### 阶段2: 性能优化 (Priority: High)

#### 2.1 JavaScript优化

**问题: Swup模块加载失败**
```javascript
// astro.config.mjs - 优化rollup配置
export default defineConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'swup': ['@swup/astro'],
            'vendor': ['svelte', 'photoswipe']
          }
        },
        onwarn(warning, warn) {
          // 忽略特定警告
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          warn(warning);
        }
      }
    }
  }
});
```

**延迟加载非关键JS:**
```html
<script defer src="/scripts/analytics.js"></script>
<script async src="https://www.clarity.ms/tag/tdtze87osu"></script>
```

#### 2.2 资源缓存策略

**配置vercel.json:**
```json
{
  "headers": [
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
      "source": "/fonts/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/:path*.webp",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=604800"
        }
      ]
    }
  ]
}
```

#### 2.3 API响应优化

**问题: /api/views/total 响应慢**
```typescript
// 当前: 每次查询所有keys
const viewKeys = await redis.keys("views:*");  // O(n)操作

// 优化: 使用Redis计数器
// 方案1: 维护总计数器
await redis.incr('total:views');
await redis.incr('total:reads');

// 方案2: 使用scan代替keys
let cursor = 0;
do {
  const result = await redis.scan(cursor, { match: 'views:*', count: 100 });
  cursor = result[0];
  // 处理结果
} while (cursor !== 0);

// 方案3: 添加缓存层
const cacheKey = 'cached:totals';
let totals = await redis.get(cacheKey);
if (!totals) {
  // 计算totals
  await redis.setex(cacheKey, 300, JSON.stringify(totals)); // 5分钟缓存
}
```

**添加响应头:**
```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    'CDN-Cache-Control': 'public, s-maxage=300'
  }
});
```

---

### 阶段3: 高级优化 (Priority: Medium)

#### 3.1 实施Service Worker

**创建sw.js:**
```javascript
const CACHE_VERSION = 'v1';
const CACHE_ASSETS = [
  '/',
  '/_astro/Layout.css',
  '/fonts/roboto-400.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CACHE_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

#### 3.2 图片懒加载

**使用Intersection Observer:**
```typescript
// src/utils/lazy-load.ts
export function setupLazyLoad() {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src!;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px'
  });

  document.querySelectorAll('img[data-src]').forEach((img) => {
    imageObserver.observe(img);
  });
}
```

#### 3.3 CSS优化

**清理CSS错误:**
```css
/* 移除无效属性 */
/* ❌ 错误 */
.element {
  -webkit-text-size-adjust: 100%;  /* 拼写错误 */
  loading: lazy;  /* 不是CSS属性 */
}

/* ✅ 正确 */
.element {
  -webkit-text-size-adjust: 100%;
}

img {
  loading: lazy;  /* HTML属性,不是CSS */
}
```

**Critical CSS提取:**
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  vite: {
    plugins: [
      criticalCSSPlugin({
        inline: true,
        minify: true
      })
    ]
  }
});
```

---

## 📈 预期性能提升

### 核心Web Vitals目标

| 指标 | 当前 | 目标 | 预期改善 |
|------|------|------|----------|
| LCP | 31.6s | <2.5s | 📉 92% |
| FID | 未测量 | <100ms | ✅ |
| CLS | 未测量 | <0.1 | ✅ |
| FCP | 未测量 | <1.8s | ✅ |
| TTI | 未测量 | <3.8s | ✅ |

### 资源加载优化

| 资源类型 | 当前问题 | 优化方案 | 预期效果 |
|---------|---------|---------|---------|
| 字体 | 404错误 | Google Fonts CDN | ✅ 100%成功率 |
| Banner | 31.6s加载 | WebP + 响应式 | 📉 90%时间 |
| JS模块 | NS_BINDING_ABORTED | 构建优化 | ✅ 消除错误 |
| 搜索 | 404错误 | 修复构建流程 | ✅ 功能恢复 |
| API | 响应慢 | Redis缓存优化 | 📉 70%响应时间 |

---

## 🔍 监控和验证

### 性能监控工具
1. **Lighthouse CI** - 持续性能监控
2. **WebPageTest** - 详细性能分析
3. **Vercel Analytics** - 实时用户指标
4. **Sentry** - 错误追踪

### 验证清单
- [ ] 所有资源返回200状态码
- [ ] 字体正常加载,无FOUT
- [ ] 搜索功能正常工作
- [ ] LCP < 2.5秒
- [ ] 无JavaScript错误
- [ ] API响应时间 < 500ms
- [ ] 移动端性能评分 > 90

---

## 🚀 实施计划

### Week 1: 关键修复
- [ ] Day 1-2: 修复字体加载
- [ ] Day 3-4: 优化Banner图片
- [ ] Day 5: 修复Pagefind搜索

### Week 2: 性能优化
- [ ] Day 1-2: JavaScript构建优化
- [ ] Day 3-4: 配置缓存策略
- [ ] Day 5: API响应优化

### Week 3: 高级功能
- [ ] Day 1-2: Service Worker实施
- [ ] Day 3-4: 图片懒加载
- [ ] Day 5: CSS优化

### Week 4: 测试和监控
- [ ] Day 1-3: 全面性能测试
- [ ] Day 4: 配置监控工具
- [ ] Day 5: 文档和总结

---

## 📚 相关资源

- [Web Vitals](https://web.dev/vitals/)
- [Astro Performance Guide](https://docs.astro.build/en/guides/performance/)
- [Pagefind Documentation](https://pagefind.app/)
- [Vercel Deployment Docs](https://vercel.com/docs)

---

**创建日期:** 2025-09-26  
**最后更新:** 2025-09-26  
**状态:** 📝 规划中 → 即将实施