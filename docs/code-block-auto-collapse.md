# 代码块自动折叠功能

## 功能说明

博客现在支持长代码块的自动折叠功能。当代码块的行数超过设定的阈值时，超出部分会自动折叠，用户可以点击展开按钮查看完整代码。

## 配置

在 [`astro.config.mjs`](../astro.config.mjs) 中配置：

```javascript
import { pluginAutoCollapse } from "./src/plugins/expressive-code/auto-collapse.ts";

expressiveCode({
  plugins: [
    pluginCollapsibleSections(),
    pluginAutoCollapse({
      // 当代码块超过20行时自动折叠
      collapseAfter: 20,
    }),
    // ... 其他插件
  ],
})
```

## 参数说明

- `collapseAfter`: 设置折叠阈值（行数），默认值为 20
  - 当代码块行数 ≤ `collapseAfter` 时，完整显示
  - 当代码块行数 > `collapseAfter` 时，超出部分自动折叠

## 使用示例

### 短代码块（不会折叠）

```javascript
function hello() {
  console.log("Hello World");
  return true;
}
```

### 长代码块（自动折叠）

当代码块超过 20 行时，第 21 行及以后的内容会被自动折叠，读者可以点击"展开"按钮查看完整代码。

## 手动控制折叠

如果你想手动控制某个代码块的折叠行为，可以在代码块的 fence 上添加 `collapse` 属性：

````markdown
```javascript collapse={10-50}
// 这里的代码第 10-50 行会被折叠
```
````

## 技术实现

该功能通过自定义的 Expressive Code 插件实现：

1. **插件位置**: [`src/plugins/expressive-code/auto-collapse.ts`](../src/plugins/expressive-code/auto-collapse.ts)
2. **工作原理**: 
   - 在代码块预处理阶段检查行数
   - 如果超过阈值，自动添加 `collapse` 元数据
   - 配合 `pluginCollapsibleSections` 插件渲染折叠效果

## 自定义阈值

如果你想修改折叠阈值，只需在 [`astro.config.mjs`](../astro.config.mjs) 中调整 `collapseAfter` 参数：

```javascript
pluginAutoCollapse({
  collapseAfter: 30, // 改为 30 行
})
```

## 样式定制

折叠功能的样式已经过优化，包含以下文件：

### 1. [`src/styles/markdown.css`](../src/styles/markdown.css)
包含折叠区域的核心样式：
- 折叠按钮的外观和交互效果
- 折叠内容的展开/收起动画
- 折叠提示文本样式

### 2. [`src/styles/expressive-code.css`](../src/styles/expressive-code.css)
包含 Expressive Code 特定的折叠样式：
- 折叠按钮的过渡效果
- 折叠区域的平滑动画
- 折叠状态指示器

### 自定义样式示例

如果你想修改折叠按钮的颜色，可以在 [`src/styles/markdown.css`](../src/styles/markdown.css) 中调整：

```css
.expressive-code .collapse-button {
    /* 修改背景色 */
    @apply bg-blue-500 hover:bg-blue-600;
    /* 修改文字颜色 */
    @apply text-white;
}
```

### 动画速度调整

修改折叠动画的速度：

```css
.expressive-code .collapsible-section {
    /* 将 300ms 改为你想要的时长 */
    @apply transition-all duration-500 ease-in-out;
}
```