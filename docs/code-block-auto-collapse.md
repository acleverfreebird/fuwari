# 代码块自动折叠功能 (最终实现)

## 功能说明

为了优化长代码块的阅读体验，博客采用了一种结合服务端预处理和客户端增强的混合方案，实现了以下功能：

- **自动折叠**: 超过 20 行的代码块会自动折叠。
- **点击切换**: 用户可以**点击**按钮来展开或重新折叠代码块。
- **平滑动画**: 展开和折叠的过程伴有流畅的动画效果。
- **智能显示**: “展开/折叠”按钮只在代码块确实超过 20 行时才会出现。

## 技术实现

这是一个三部分协作的系统：

### 1. 服务端插件 (`pluginAutoCollapse`)

- **文件**: [`src/plugins/expressive-code/auto-collapse.ts`](../src/plugins/expressive-code/auto-collapse.ts)
- **作用**: 在 Astro 构建时，这个插件会检查每个代码块的行数。如果超过 `collapseAfter` (默认为 20) 的阈值，它会自动为该代码块添加 `collapse={...}` 元数据。

### 2. 服务端插件 (`pluginCollapsibleSections`)

- **文件**: 这是 `expressive-code` 的官方插件，在 [`astro.config.mjs`](../astro.config.mjs) 中启用。
- **作用**: 它会读取由 `pluginAutoCollapse` 生成的元数据，并据此生成实现折叠功能所需的 HTML 结构（包括 `<details>`、`<summary>` 元素和一个 svg 图标）。

### 3. 客户端脚本与样式 (`Markdown.astro`)

- **文件**: [`src/components/misc/Markdown.astro`](../src/components/misc/Markdown.astro)
- **作用**:
    - **CSS**: 文件内的 `<style>` 标签定义了实现平滑折叠/展开动画的样式。它使用了 `grid-template-rows` 动画，这是实现动态高度平滑过渡的最佳实践。
    - **JavaScript**: 文件内的 `<script>` 标签负责监听 `astro:page-load` 事件，确保无论是首次加载还是页面切换后，都能为折叠按钮绑定必要的事件监听器。虽然 `expressive-code` 已经处理了大部分点击逻辑，但我们的脚本为未来的功能扩展（如更复杂的动画）预留了空间。

## 自定义

### 修改折叠行数

要调整折叠前显示的最大行数，只需修改 [`astro.config.mjs`](../astro.config.mjs) 文件中传递给 `pluginAutoCollapse` 的参数即可。

```javascript
// astro.config.mjs
// ...
plugins: [
    pluginAutoCollapse({ collapseAfter: 25 }), // 将默认的 20 行改为 25 行
    // ...
],
```

### 调整动画速度

动画的速度由 [`src/components/misc/Markdown.astro`](../src/components/misc/Markdown.astro) 中的 CSS `transition` 属性控制。

```css
/* src/components/misc/Markdown.astro */
.ec-collapsible-section {
  /* 将 0.3s 改为您想要的时长 */
  transition: grid-template-rows 0.5s ease-in-out;
}