# Lighthouse 优化快速参考指南

> 基于 2025-10-25 Lighthouse 审计的快速行动指南

## 🎯 当前状态

**Performance Score: 78/100** → **目标: 95+**

## 🔥 立即行动项（高优先级）

### 1. 修复强制重排 (最高优先级) 🔴

**问题**: 265ms 的强制同步布局

**快速修复**:
```javascript
// src/layouts/Layout.astro - 第 643 行附近

// ❌ 当前代码（导致强制重排）
window.onresize = () => {
    let offset = Math.floor(window.innerHeight * (BANNER_HEIGHT_EXTEND / 100));
    offset = offset - offset % 4;
    document.documentElement.style.setProperty('--banner-height-extend', `${offset}px`);
}

// ✅ 优化后（使用 requestAnimationFrame）
window.onresize = () => {
    requestAnimationFrame(() => {
        let offset = Math.floor(window.innerHeight * (BANNER_HEIGHT_EXTEND / 100));
        offset = offset - offset % 4;
        document.documentElement.style.setProperty('--banner-height-extend', `${offset}px`);
    });
}
```

**预期效果**: TBT ↓ 50% (90ms → 45ms)

---

### 2. 优化 Avatar 图片 🔴

**问题**: 图片过大，浪费 9 KiB

**快速修复**:
```astro
<!-- src/components/widget/Profile.astro - 第 22 行 -->

<!-- ❌ 当前 -->
<ImageWrapper 
    src={config.avatar || ""} 
    width={622} 
    height={622}
/>

<!-- ✅ 优化后 -->
<ImageWrapper 
    src={config.avatar || ""} 
    width={512} 
    height={512}
/>
```

**预期效果**: 图片大小 ↓ 32% (9 KiB)

---

### 3. 添加 LCP 图片优先级 🔴

**问题**: LCP 图片未设置高优先级

**快速修复**:
```astro
<!-- src/layouts/MainGridLayout.astro - 第 89 行 -->

<!-- ❌ 当前 -->
<ImageWrapper 
    id="banner" 
    src={siteConfig.banner.src} 
    priority={true}
    loading="eager"
    sizes="100vw"
/>

<!-- ✅ 优化后 -->
<ImageWrapper 
    id="banner" 
    src={siteConfig.banner.src} 
    priority={true}
    loading="eager"
    fetchpriority="high"
    sizes="100vw"
/>
```

**同时在 [`src/components/misc/ImageWrapper.astro`](src/components/misc/ImageWrapper.astro:74) 添加 fetchpriority 支持**:
```astro
<!-- 第 4-16 行，添加 fetchpriority 属性 -->
interface Props {
    id?: string;
    src: string;
    class?: string;
    alt?: string;
    position?: string;
    basePath?: string;
    loading?: "lazy" | "eager";
    priority?: boolean;
    fetchpriority?: "high" | "low" | "auto";  // 新增
    sizes?: string;
    width?: number;
    height?: number;
}

<!-- 第 21-32 行，添加默认值 -->
const {
    id,
    src,
    alt,
    position = "center",
    basePath = "/",
    loading = "lazy",
    priority = false,
    fetchpriority = "auto",  // 新增
    sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    width,
    height,
} = Astro.props;

<!-- 第 69-79 行，应用到 Image 组件 -->
<Image
    src={img}
    alt={alt || ""}
    class={imageClass}
    style={imageStyle}
    loading={priority ? "eager" : loading}
    decoding={priority ? "sync" : "async"}
    fetchpriority={fetchpriority}  // 新增
    sizes={sizes}
    width={width}
    height={height}
/>

<!-- 第 82-91 行，应用到 img 标签 -->
<img
    src={isPublic ? url(src) : src}
    alt={alt || ""}
    class={imageClass}
    style={imageStyle}
    loading={priority ? "eager" : loading}
    decoding={priority ? "sync" : "async"}
    fetchpriority={fetchpriority}  // 新增
    width={width}
    height={height}
/>
```

**预期效果**: LCP ↓ 20% (1.8s → 1.44s)

---

### 4. 优化长任务执行 🔴

**问题**: 6 个长任务阻塞主线程

**快速修复**:
```javascript
// src/layouts/Layout.astro - 第 487-504 行

// ❌ 当前代码
function init() {
    loadTheme();
    loadHue();
    showBanner();
    
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            initCustomScrollbar();
        }, { timeout: 2000 });
    } else {
        setTimeout(() => {
            initCustomScrollbar();
        }, 100);
    }
}

// ✅ 优化后（任务分片）
async function init() {
    // 关键任务 - 立即执行
    loadTheme();
    
    // 让出主线程
    await new Promise(resolve => setTimeout(resolve, 0));
    
    loadHue();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    showBanner();
    
    // 非关键任务 - 延迟执行
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            initCustomScrollbar();
        }, { timeout: 2000 });
    } else {
        setTimeout(() => {
            initCustomScrollbar();
        }, 100);
    }
}
```

**预期效果**: 长任务数量 ↓ 50%, TBT ↓ 30%

---

## 🟡 中优先级优化

### 5. 内联关键 CSS

**快速修复**:
```astro
<!-- src/layouts/Layout.astro - 在 <head> 中添加 -->

<style>
    /* 内联首屏关键 CSS */
    :root {
        --page-bg: #ffffff;
        --card-bg: #f8f9fa;
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
</style>

<!-- 延迟加载非关键 CSS -->
<link 
    rel="preload" 
    href="/_astro/Layout.CFwGdNXj.css" 
    as="style" 
    onload="this.onload=null;this.rel='stylesheet'"
/>
```

**预期效果**: FCP ↓ 25% (1.6s → 1.2s)

---

### 6. 预加载关键资源

**快速修复**:
```astro
<!-- src/layouts/Layout.astro - 在 <head> 中添加 -->

<head>
    <!-- 预加载 LCP 图片 -->
    <link 
        rel="preload" 
        as="image" 
        href={siteConfig.banner.src}
        fetchpriority="high"
        type="image/webp"
    />
    
    <!-- 预加载关键 JavaScript -->
    <link rel="modulepreload" href="/_astro/Swup.DeYJ0Ufc.js" />
    
    <!-- 预连接关键域名 -->
    <link rel="preconnect" href="https://get-views.freebird2913.tech" />
    <link rel="dns-prefetch" href="https://v1.hitokoto.cn" />
</head>
```

**预期效果**: LCP ↓ 15%, 关键路径延迟 ↓ 30%

---

### 7. 延迟第三方脚本

**快速修复**:
```astro
<!-- src/layouts/Layout.astro - 第 224-237 行 -->

<!-- ❌ 当前代码 -->
<script is:inline>
    function loadClarity() {
        const script = document.createElement('script');
        script.src = 'https://www.clarity.ms/tag/tdtze87osu?ref=bwt';
        script.async = true;
        document.head.appendChild(script);
    }

    window.onload = function() {
        setTimeout(loadClarity, 2000);
    };
</script>

<!-- ✅ 优化后（延迟更久） -->
<script is:inline>
    function loadClarity() {
        const script = document.createElement('script');
        script.src = 'https://www.clarity.ms/tag/tdtze87osu?ref=bwt';
        script.async = true;
        document.head.appendChild(script);
    }

    // 延迟 5 秒或用户交互后加载
    let clarityLoaded = false;
    function tryLoadClarity() {
        if (!clarityLoaded) {
            clarityLoaded = true;
            loadClarity();
        }
    }
    
    window.addEventListener('load', () => {
        setTimeout(tryLoadClarity, 5000);
    });
    
    // 或者在用户交互时加载
    ['click', 'scroll', 'keydown'].forEach(event => {
        window.addEventListener(event, tryLoadClarity, { once: true });
    });
</script>
```

**预期效果**: TBT ↓ 15%, 首屏加载 ↑ 10%

---

## 📊 优化效果预测

| 优化项 | 难度 | 时间 | 效果 |
|--------|------|------|------|
| 修复强制重排 | 🟢 简单 | 5分钟 | ⭐⭐⭐⭐⭐ |
| 优化 Avatar 图片 | 🟢 简单 | 2分钟 | ⭐⭐⭐ |
| LCP 图片优先级 | 🟢 简单 | 5分钟 | ⭐⭐⭐⭐ |
| 优化长任务 | 🟡 中等 | 15分钟 | ⭐⭐⭐⭐ |
| 内联关键 CSS | 🟡 中等 | 20分钟 | ⭐⭐⭐⭐⭐ |
| 预加载资源 | 🟢 简单 | 10分钟 | ⭐⭐⭐ |
| 延迟第三方脚本 | 🟢 简单 | 5分钟 | ⭐⭐⭐ |

**总预计时间**: ~1 小时  
**预期性能提升**: 78 → 88+ (↑ 13%)

---

## 🚀 快速实施流程

### 步骤 1: 准备工作 (5分钟)
```bash
# 1. 创建新分支
git checkout -b lighthouse-optimization

# 2. 备份当前代码
git add .
git commit -m "Backup before Lighthouse optimization"
```

### 步骤 2: 实施优化 (45分钟)
按照上述 7 个优化项依次修改代码

### 步骤 3: 本地测试 (10分钟)
```bash
# 1. 构建项目
npm run build

# 2. 预览构建结果
npm run preview

# 3. 运行 Lighthouse
# 在 Chrome DevTools 中运行 Lighthouse 审计
```

### 步骤 4: 部署验证 (5分钟)
```bash
# 1. 提交更改
git add .
git commit -m "feat: Lighthouse performance optimization"

# 2. 推送到远程
git push origin lighthouse-optimization

# 3. 创建 PR 并部署到 Vercel
```

---

## ✅ 验证清单

### 本地验证
- [ ] Lighthouse Performance Score > 85
- [ ] FCP < 1.3s
- [ ] LCP < 1.5s
- [ ] TBT < 60ms
- [ ] 所有功能正常工作
- [ ] 无控制台错误

### 生产验证
- [ ] Vercel Speed Insights RES > 85
- [ ] 真实用户 LCP < 2.0s
- [ ] 真实用户 INP < 200ms
- [ ] 无错误报告
- [ ] 用户反馈正常

---

## 🔍 常见问题

### Q1: 修改后性能反而下降了？
**A**: 检查以下几点：
1. 确保所有修改都正确应用
2. 清除浏览器缓存后重新测试
3. 在隐身模式下测试（避免扩展影响）
4. 检查控制台是否有错误

### Q2: fetchpriority 属性不生效？
**A**: 确保：
1. 使用的是最新版本的 Astro
2. 浏览器支持 fetchpriority（Chrome 101+）
3. 属性正确传递到最终的 HTML

### Q3: 强制重排问题仍然存在？
**A**: 检查：
1. 是否所有 DOM 读取都在 `requestAnimationFrame` 之前
2. 是否有其他代码也在触发重排
3. 使用 Chrome DevTools Performance 面板定位具体代码

---

## 📚 相关文档

- [完整优化计划](LIGHTHOUSE_OPTIMIZATION_PLAN.md)
- [Speed Insights 优化计划](SPEED_INSIGHTS_OPTIMIZATION_PLAN_2025.md)
- [性能优化总结](PERFORMANCE_OPTIMIZATION_SUMMARY.md)

---

**创建日期**: 2025-10-25  
**适用版本**: Fuwari v1.x  
**预计完成时间**: 1 小时  
**难度**: 🟢 简单到中等