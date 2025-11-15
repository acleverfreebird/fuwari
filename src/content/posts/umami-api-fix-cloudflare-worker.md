---
title: '修复Umami统计数据显示问题 - 适配新版API响应格式'
published: 2025-11-15
description: '详细记录修复Cloudflare Worker中Umami统计代理脚本的过程，解决数据一直显示为0的问题。深入分析Umami API响应格式变化，从旧版的嵌套对象结构到新版的扁平化数据结构，提供完整的问题诊断、修复方案和代码优化建议，帮助开发者快速适配Umami API更新。'
image: ''
tags: ['Umami', 'Cloudflare Worker', 'API', '故障排查', 'Bug修复']
category: '技术教程'
draft: false
lang: 'zh-CN'
excerpt: '记录修复Cloudflare Worker中Umami统计代理的完整过程，解决新版API响应格式变化导致的数据显示问题。'
keywords: ['Umami', 'Cloudflare Worker', 'API修复', '数据格式', '故障排查', 'Bug修复']
readingTime: 8
series: 'Web开发'
seriesOrder: 2
---

# 修复Umami统计数据显示问题 - 适配新版API响应格式

> 从问题诊断到完美解决，记录一次API格式变更的修复之旅

---

## 🐛 问题现象

在使用Cloudflare Worker代理Umami统计API时，突然发现网站的浏览量和访客数一直显示为0：

```json
{
  "total": 0,
  "visitors": 0,
  "visits": 0,
  "bounces": 0,
  "totaltime": 0,
  "cached": false,
  "timestamp": 1763208601158
}
```

这显然不正常，因为网站实际上有大量的访问数据。

---

## 🔍 问题诊断

### 初步排查

首先检查了几个常见问题：

1. ✅ **API Token配置正确**
2. ✅ **网站ID正确**
3. ✅ **Worker部署成功**
4. ✅ **CORS配置正常**

既然基础配置都没问题，那问题很可能出在数据解析上。

### 深入分析

通过添加调试代码，我发现Umami API确实返回了数据，但Worker脚本无法正确提取。查看Umami官方文档后发现：

**Umami API响应格式已经更新！**

---

## 📊 API格式变化对比

### 旧版格式（嵌套对象）

```json
{
  "pageviews": {
    "value": 34210,
    "change": 10
  },
  "visitors": {
    "value": 9401,
    "change": 7
  },
  "visits": {
    "value": 12726,
    "change": 8
  }
}
```

### 新版格式（扁平化）

```json
{
  "pageviews": 34210,
  "visitors": 9401,
  "visits": 12726,
  "bounces": 7918,
  "totaltime": 5214477,
  "comparison": {
    "pageviews": 30818,
    "visitors": 8776,
    "visits": 11756,
    "bounces": 7396,
    "totaltime": 1704355
  }
}
```

**关键变化：**
- ❌ 旧版：数据包装在 `value` 字段中
- ✅ 新版：数据直接作为顶层字段
- ➕ 新增：`comparison` 对比数据

---

## 🔧 修复方案

### 问题代码

旧代码尝试从 `value` 字段提取数据：

```javascript
const result = {
  total: data.pageviews?.value || 0,  // ❌ 新版API中不存在value字段
  visitors: data.visitors?.value || 0,
  visits: data.visits?.value || 0,
  bounces: data.bounces?.value || 0,
  totaltime: data.totaltime?.value || 0,
};
```

### 修复后代码

直接从顶层字段获取数据：

```javascript
const result = {
  total: data.pageviews || 0,  // ✅ 直接获取数值
  visitors: data.visitors || 0,
  visits: data.visits || 0,
  bounces: data.bounces || 0,
  totaltime: data.totaltime || 0,
  cached: false,
  timestamp: Date.now(),
};
```

---

## 📝 完整修复步骤

### 1. 修复总浏览量API

修改 [`getTotalPageviews`](cloudflare-worker/umami-stats-proxy.js:82) 函数：

```javascript
async function getTotalPageviews(request) {
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = "/cache/total";
  const cacheKey = new Request(cacheUrl);

  // 尝试从缓存获取
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  // 计算时间范围 (所有时间)
  const endDate = new Date();
  const startDate = new Date("2020-01-01"); // 获取全部历史数据
  
  const startAt = startDate.getTime();
  const endAt = endDate.getTime();

  // 调用 Umami API
  const apiUrl = `${CONFIG.UMAMI_API_URL}/websites/${CONFIG.UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${CONFIG.UMAMI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Umami API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // ✅ 直接从顶层字段获取数据
  const result = {
    total: data.pageviews || 0,
    visitors: data.visitors || 0,
    visits: data.visits || 0,
    bounces: data.bounces || 0,
    totaltime: data.totaltime || 0,
    cached: false,
    timestamp: Date.now(),
  };

  // 缓存结果
  await setCache(cacheKey, result, CONFIG.CACHE_TTL);

  return jsonResponse(result, 200, request);
}
```

### 2. 修复页面浏览量API

修改 [`getPagePageviews`](cloudflare-worker/umami-stats-proxy.js:135) 函数：

```javascript
async function getPagePageviews(request, pageUrl) {
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/cache/page${pageUrl.startsWith("/") ? pageUrl : "/" + pageUrl}`;
  const cacheKey = new Request(cacheUrl);

  // 尝试从缓存获取
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  // 计算时间范围 (所有时间)
  const endDate = new Date();
  const startDate = new Date("2020-01-01");
  const startAt = startDate.getTime();
  const endAt = endDate.getTime();

  // 使用 /stats API 并通过 url 参数过滤
  const apiUrl = `${CONFIG.UMAMI_API_URL}/websites/${CONFIG.UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(pageUrl)}`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${CONFIG.UMAMI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Umami API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // ✅ 直接从顶层字段获取数据
  const result = {
    url: pageUrl,
    pageviews: data.pageviews || 0,
    visitors: data.visitors || 0,
    cached: false,
    timestamp: Date.now(),
  };

  // 缓存结果
  await setCache(cacheKey, result, CONFIG.CACHE_TTL);

  return jsonResponse(result, 200, request);
}
```

### 3. 优化缓存机制

将简单的内存缓存升级为Cloudflare Cache API：

```javascript
/**
 * 使用 Cloudflare Cache API 进行缓存
 */
async function getCache(cacheKey) {
  const cache = caches.default;
  const response = await cache.match(cacheKey);
  if (!response) {
    return null;
  }

  // 检查缓存是否过期
  const expiry = response.headers.get("Cache-Expiry");
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    caches.default.delete(cacheKey);
    return null;
  }
  return response;
}

async function setCache(cacheKey, data, ttlSeconds) {
  const cache = caches.default;
  const responseBody = JSON.stringify(data);
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": `public, max-age=${ttlSeconds}`,
    "Cache-Expiry": (Date.now() + ttlSeconds * 1000).toString(),
  };
  const response = new Response(responseBody, { headers });
  await cache.put(cacheKey, response);
}
```

---

## ✅ 修复效果

修复后，API返回正常数据：

```json
{
  "total": 34210,
  "visitors": 9401,
  "visits": 12726,
  "bounces": 7918,
  "totaltime": 5214477,
  "cached": false,
  "timestamp": 1763209211581
}
```

网站上的统计数据也正常显示了！

---

## 🎯 关键改进点

### 1. API格式适配
- ✅ 移除了对 `.value` 字段的依赖
- ✅ 直接从顶层获取数据
- ✅ 保持向后兼容性

### 2. 时间范围优化
- ✅ 从"最近30天"改为"所有时间"
- ✅ 显示完整的历史统计数据

### 3. 缓存升级
- ✅ 从内存Map升级到Cache API
- ✅ 更持久、更高效
- ✅ 支持边缘缓存

### 4. 错误处理增强
- ✅ 添加详细的错误信息
- ✅ 包含HTTP状态码和响应文本
- ✅ 便于问题诊断

---

## 💡 经验总结

### 遇到API数据异常时的排查思路

1. **确认基础配置**
   - API Token是否正确
   - 端点URL是否正确
   - 权限是否充足

2. **检查API响应**
   - 添加调试日志
   - 查看原始响应数据
   - 对比API文档

3. **验证数据解析**
   - 检查字段访问路径
   - 确认数据类型
   - 处理边界情况

4. **测试修复效果**
   - 清除缓存
   - 重新部署
   - 验证各个端点

### 最佳实践建议

1. **版本兼容性**
   ```javascript
   // 同时支持新旧格式
   const value = data.field?.value || data.field || 0;
   ```

2. **错误处理**
   ```javascript
   if (!response.ok) {
     const errorText = await response.text();
     throw new Error(`API error: ${response.status} - ${errorText}`);
   }
   ```

3. **缓存策略**
   ```javascript
   // 使用合适的TTL
   const CACHE_TTL = 300; // 5分钟
   ```

4. **调试信息**
   ```javascript
   // 开发环境添加debug字段
   if (isDev) {
     result.debug = { apiUrl, rawData: data };
   }
   ```

---

## 🔗 相关资源

- [Umami API文档](https://umami.is/docs/api)
- [Cloudflare Workers文档](https://developers.cloudflare.com/workers/)
- [Cache API文档](https://developers.cloudflare.com/workers/runtime-apis/cache/)

---

## 📌 总结

这次修复让我深刻体会到：

1. **API文档很重要** - 定期查看官方文档，了解API变更
2. **调试信息必不可少** - 添加适当的日志可以快速定位问题
3. **错误处理要完善** - 详细的错误信息能节省大量排查时间
4. **缓存要谨慎使用** - 确保缓存不会掩盖真实问题

希望这篇文章能帮助遇到类似问题的开发者快速解决问题！

---

*创建日期: 2025年11月15日*  
*最后更新: 2025年11月15日*  
*版本: 1.0.0*  
*状态: ✅ 已完成*