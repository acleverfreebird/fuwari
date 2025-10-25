# 文章目录（TOC）显示优化方案

## 📋 需求概述

在文章页面的右侧显示目录（Table of Contents），并确保点击目录项后能够平滑滚动到对应的标题位置。

### 用户需求
- ✅ 在桌面端（lg及以上屏幕）右侧显示目录
- ✅ 移动端不显示目录
- ✅ 点击目录项可以滚动到对应位置

## 🔍 现状分析

### 当前实现
1. **TOC组件位置**：[`src/components/widget/TOC.astro`](src/components/widget/TOC.astro:1)
2. **布局文件**：[`src/layouts/MainGridLayout.astro`](src/layouts/MainGridLayout.astro:1)
3. **当前显示条件**：只在 `2xl` 屏幕（≥1536px）上显示
4. **功能状态**：
   - ✅ 目录生成功能正常
   - ✅ 点击滚动功能已实现（[`handleAnchorClick`](src/components/widget/TOC.astro:183)）
   - ✅ 活动标题高亮功能已实现
   - ✅ IntersectionObserver 监听滚动位置

### 问题识别
- ❌ 显示条件过于严格（仅2xl屏幕）
- ❌ 在lg和xl屏幕上无法看到目录
- ⚠️ 需要调整响应式断点

## 🎯 实施方案

### 方案概述
将TOC的显示断点从 `2xl`（≥1536px）调整为 `lg`（≥1024px），使其在更多桌面设备上可见。

### 技术细节

#### 1. 响应式断点调整
**文件**：[`src/layouts/MainGridLayout.astro`](src/layouts/MainGridLayout.astro:142)

**当前代码**（第142-155行）：
```astro
<div class="absolute w-full z-0 hidden 2xl:block">
    <div class="relative max-w-[var(--page-width)] mx-auto">
        <!-- TOC component -->
        {siteConfig.toc.enable && <div id="toc-wrapper" class:list={["hidden lg:block transition absolute top-0 -right-[var(--toc-width)] w-[var(--toc-width)] items-center",
            {"toc-hide": siteConfig.banner.enable}]}
        >
```

**需要修改**：
- 外层容器：`hidden 2xl:block` → `hidden lg:block`
- 内层容器：保持 `hidden lg:block`（已经正确）

#### 2. 布局结构说明

当前布局采用三栏设计：
```
┌─────────────────────────────────────────────────────────┐
│                        Navbar                           │
├──────────┬─────────────────────────┬────────────────────┤
│          │                         │                    │
│ Sidebar  │   Main Content          │   TOC (右侧)       │
│ (左侧)   │   (文章内容)            │   (目录)           │
│          │                         │                    │
│ Profile  │   - 标题                │   - 标题1          │
│ Category │   - 元数据              │   - 标题2          │
│ Tags     │   - 正文                │   - 标题3          │
│          │   - 评论                │                    │
│          │                         │                    │
└──────────┴─────────────────────────┴────────────────────┘
```

**响应式行为**：
- **移动端（< lg）**：单栏布局，只显示主内容
- **桌面端（≥ lg）**：三栏布局，显示侧边栏 + 主内容 + TOC

#### 3. CSS变量和样式

**TOC宽度**：使用CSS变量 `--toc-width`
**定位方式**：
- 外层容器：`absolute`，`z-0`（在内容下方）
- TOC包装器：`absolute`，`-right-[var(--toc-width)]`（定位在右侧）
- 内部容器：`fixed`，`top-14`（固定在视口）

#### 4. 滚动和高亮功能

**已实现的功能**：
1. **IntersectionObserver**：监听标题元素的可见性
2. **活动指示器**：高亮当前阅读位置的标题
3. **平滑滚动**：点击目录项平滑滚动到对应位置
4. **自动滚动**：TOC自动滚动以显示活动项

**关键方法**：
- [`markVisibleSection`](src/components/widget/TOC.astro:82)：标记可见的章节
- [`toggleActiveHeading`](src/components/widget/TOC.astro:98)：切换活动标题高亮
- [`handleAnchorClick`](src/components/widget/TOC.astro:183)：处理点击事件

## 📝 实施步骤

### 步骤1：修改响应式类
**文件**：[`src/layouts/MainGridLayout.astro`](src/layouts/MainGridLayout.astro:142)

**修改位置**：第142行
```diff
- <div class="absolute w-full z-0 hidden 2xl:block">
+ <div class="absolute w-full z-0 hidden lg:block">
```

### 步骤2：验证TOC配置
**文件**：[`src/config.ts`](src/config.ts:29)

确认TOC已启用：
```typescript
toc: {
    enable: true,  // ✅ 已启用
    depth: 2,      // 显示2级标题
}
```

### 步骤3：测试点击滚动功能

**测试场景**：
1. 打开任意文章页面
2. 在lg屏幕（≥1024px）上查看右侧TOC
3. 点击TOC中的任意标题
4. 验证页面是否平滑滚动到对应位置
5. 验证活动指示器是否正确高亮

### 步骤4：响应式测试

**测试断点**：
- **移动端（< 1024px）**：TOC应该隐藏
- **桌面端（≥ 1024px）**：TOC应该显示在右侧
- **超大屏（≥ 1536px）**：TOC应该正常显示

## 🎨 样式优化建议

### 当前样式分析
TOC组件使用了以下样式特性：
- 悬停效果：`hover:bg-[var(--toc-btn-hover)]`
- 活动状态：`active:bg-[var(--toc-btn-active)]`
- 活动指示器：带虚线边框的背景高亮
- 层级缩进：通过 `ml-4`、`ml-8` 实现

### 可能的优化点
1. **滚动条样式**：已使用 `hide-scrollbar` 类隐藏滚动条
2. **过渡动画**：已使用 `transition` 类实现平滑过渡
3. **主题适配**：已支持深色/浅色主题切换

## ⚠️ 注意事项

### 1. 布局冲突
- TOC使用 `absolute` 定位，不会影响主内容布局
- 确保 `--page-width` 和 `--toc-width` 变量正确设置

### 2. 性能考虑
- IntersectionObserver 已优化，使用 `threshold: 0`
- 动画使用 `requestAnimationFrame` 优化性能

### 3. 兼容性
- 使用了 Custom Elements（`table-of-contents`）
- 需要现代浏览器支持

### 4. 边界情况
- 文章无标题时：TOC不显示（已处理）
- 标题过多时：TOC可滚动（已实现）
- 快速滚动时：使用 `fallback` 方法确保准确性

## 🧪 测试清单

- [ ] lg屏幕（1024px）上TOC正确显示
- [ ] xl屏幕（1280px）上TOC正确显示
- [ ] 2xl屏幕（1536px）上TOC正确显示
- [ ] 移动端（< 1024px）TOC正确隐藏
- [ ] 点击TOC项能平滑滚动到对应位置
- [ ] 滚动页面时活动指示器正确高亮
- [ ] 深色/浅色主题下样式正常
- [ ] 长文章中TOC自动滚动功能正常

## 📊 预期效果

### 修改前
- 只在超大屏幕（≥1536px）显示TOC
- 大部分桌面用户看不到目录

### 修改后
- 在桌面端（≥1024px）显示TOC
- 覆盖更多桌面设备
- 移动端保持隐藏，不影响阅读体验

## 🔄 回滚方案

如果修改后出现问题，可以快速回滚：

```diff
+ <div class="absolute w-full z-0 hidden 2xl:block">
- <div class="absolute w-full z-0 hidden lg:block">
```

## 📚 相关文件

### 核心文件
1. [`src/layouts/MainGridLayout.astro`](src/layouts/MainGridLayout.astro:1) - 主布局文件
2. [`src/components/widget/TOC.astro`](src/components/widget/TOC.astro:1) - TOC组件
3. [`src/config.ts`](src/config.ts:29) - TOC配置

### 相关组件
1. [`src/components/widget/SideBar.astro`](src/components/widget/SideBar.astro:1) - 左侧边栏
2. [`src/pages/posts/[...slug].astro`](src/pages/posts/[...slug].astro:1) - 文章页面

## 🎯 总结

这是一个**简单但有效**的优化方案：
- ✅ 只需修改一行代码
- ✅ 不影响现有功能
- ✅ 提升用户体验
- ✅ 保持响应式设计
- ✅ 点击滚动功能已经完善

**核心修改**：将TOC显示断点从 `2xl` 改为 `lg`，使更多桌面用户能够使用目录导航功能。