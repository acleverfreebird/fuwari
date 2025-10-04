# ⚡ 性能优化快速修复指南

> **🎯 目标: 在 2 小时内修复最关键的性能问题**

---

## 🚨 紧急修复 (优先级最高)

### 1️⃣ 修复 Pagefind 搜索 (15分钟)

**问题:** 搜索功能 404 错误

**快速修复:**

```bash
# 验证 Pagefind 是否安装
npm list pagefind

# 手动构建并测试
npm run build
ls -la dist/pagefind/

# 如果没有 pagefind 目录，执行:
npx pagefind --site dist --verbose
```

**验证:**
```bash
# 检查文件是否存在
curl -I https://www.freebird2913.tech/pagefind/pagefind.js
# 应该返回 200，而不是 404
```

---

### 2️⃣ 修复 API 重定向 (10分钟)

**问题:** API 请求产生 308 重定向

**快速修复:**

编辑 `public/scripts/page-analytics.js`:

```javascript
// 第 6 行，修改 API_BASE
const CONFIG = {
  READ_THRESHOLD: 0.75,
  API_BASE: "/api",  // 保持不变
  DEBOUNCE_DELAY: 100,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// 第 81、98、115 行，在路径末尾添加 /
async function incrementViews() {
  // 修改前: `${CONFIG.API_BASE}/views/${state.slug}`
  // 修改后:
  const result = await apiRequest(`${CONFIG.API_BASE}/views/${state.slug}/`);
}

async function incrementReads() {
  // 修改前: `${CONFIG.API_BASE}/reads/${state.slug}`
  // 修改后:
  const result = await apiRequest(`${CONFIG.API_BASE}/reads/${state.slug}/`);
}

async function fetchCurrentStats() {
  // 修改前: `${CONFIG.API_BASE}/stats/${state.slug}`
  // 修改后:
  const response = await fetch(`${CONFIG.API_BASE}/stats/${state.slug}/`);
}
```

**或者添加 Vercel 重写规则:**

编辑 `vercel.json`，在 `rewrites` 数组中添加:

```json
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

### 3️⃣ 修复 Banner 图片 (5分钟)

**问题:** Banner 图片 404

**快速检查:**

```bash
# 检查图片是否存在
ls -la src/assets/images/banner.png
ls -la public/assets/images/banner.png
```

**快速修复:**

如果图片存在于 `src/assets/images/`:
- ✅ 配置正确，无需修改

如果图片存在于 `public/assets/images/`:
```typescript
// 编辑 src/config.ts
export const siteConfig: SiteConfig = {
  banner: {
    enable: true,
    src: "/assets/images/banner.png",  // 添加前导 /
    position: "center",
  },
};
```

**验证:**
```bash
curl -I https://www.freebird2913.tech/assets/images/banner.png
# 应该返回 200
```

---

## ⚡ 快速性能提升 (30分钟)

### 4️⃣ 延迟加载第三方脚本

**编辑 `src/layouts/Layout.astro`:**

找到 Clarity 脚本部分 (约第 220-238 行)，替换为:

```astro
<!-- Microsoft Clarity - 延迟加载 -->
<script is:inline>
  // 页面加载完成后 3 秒再加载 Clarity
  window.addEventListener('load', () => {
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = 'https://www.clarity.ms/tag/tdtze87osu?ref=bwt';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }, 3000);
  });
</script>
```

---

### 5️⃣ 优化字体加载

**编辑 `src/layouts/Layout.astro`，找到字体加载部分 (约第 89-92 行):**

```astro
<!-- 优化前 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">

<!-- 优化后 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"></noscript>
```

---

### 6️⃣ 添加图片预加载

**编辑 `src/layouts/Layout.astro`，在 `<head>` 中添加:**

```astro
<!-- Banner 图片预加载 -->
{siteConfig.banner.enable && (
  <link 
    rel="preload" 
    as="image" 
    href={banner}
    fetchpriority="high"
  />
)}
```

---

## 🔧 Vercel 配置优化 (10分钟)

### 7️⃣ 更新缓存策略

**编辑 `vercel.json`:**

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
      "source": "/api/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=60, stale-while-revalidate=300"
        }
      ]
    },
    {
      "source": "/pagefind/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, stale-while-revalidate=86400"
        }
      ]
    }
  ]
}
```

---

## 📋 部署前检查清单

```bash
# 1. 清理并重新构建
rm -rf dist node_modules/.vite
npm run build

# 2. 验证 Pagefind
ls -la dist/pagefind/pagefind.js
# 应该看到文件存在

# 3. 本地预览测试
npm run preview
# 访问 http://localhost:4321
# 测试搜索功能

# 4. 检查控制台
# 打开浏览器开发者工具
# 不应该看到 404 错误

# 5. 部署
git add .
git commit -m "fix: 修复性能问题 - Pagefind, API重定向, 图片404"
git push

# 6. 部署后验证
# 等待 Vercel 部署完成
# 访问生产环境测试
```

---

## 🎯 验证修复结果

### 在线测试工具

1. **Lighthouse**
   ```bash
   # 使用 Chrome DevTools
   # F12 → Lighthouse → 生成报告
   ```

2. **PageSpeed Insights**
   - 访问: https://pagespeed.web.dev/
   - 输入: https://www.freebird2913.tech/
   - 点击"分析"

3. **WebPageTest**
   - 访问: https://www.webpagetest.org/
   - 测试 URL: https://www.freebird2913.tech/

### 预期改善

| 指标 | 修复前 | 修复后 | 状态 |
|------|--------|--------|------|
| Pagefind 404 | ❌ 失败 | ✅ 正常 | 已修复 |
| API 重定向 | 308 | 200 | 已修复 |
| Banner 图片 | 404 | 200 | 已修复 |
| FCP | 3.7s | ~2.5s | 改善 |
| LCP | 5.4s | ~3.5s | 改善 |

---

## 🆘 常见问题

### Q1: Pagefind 仍然 404?

**A:** 检查构建命令:
```json
// package.json
{
  "scripts": {
    "build": "astro build && pagefind --site dist --verbose"
  }
}
```

### Q2: API 仍然重定向?

**A:** 确保在 API 路径末尾添加 `/`:
- ❌ `/api/stats/total`
- ✅ `/api/stats/total/`

### Q3: 图片仍然 404?

**A:** 检查图片路径配置:
- 如果在 `src/assets/` → 不要加 `/` 前缀
- 如果在 `public/` → 必须加 `/` 前缀

### Q4: 修复后性能没有明显改善?

**A:** 清除缓存后重新测试:
```bash
# Chrome
# F12 → Network → Disable cache
# 或者使用无痕模式
```

---

## 📞 获取帮助

如果遇到问题:

1. **查看详细方案:** `docs/WEBSITE_PERFORMANCE_OPTIMIZATION_PLAN.md`
2. **检查构建日志:** Vercel 部署页面的 Build Logs
3. **查看错误日志:** 浏览器控制台 (F12)

---

## ✅ 完成标记

- [ ] Pagefind 搜索功能正常
- [ ] API 请求无重定向
- [ ] Banner 图片正常显示
- [ ] 第三方脚本已延迟加载
- [ ] 字体加载已优化
- [ ] 控制台无 404 错误
- [ ] Lighthouse 分数 > 70

**预计总耗时: 1-2 小时**
**预期性能提升: 20-30 分**

祝优化顺利! 🚀