import purgecss from "@fullhuman/postcss-purgecss";
import postcssImport from "postcss-import";
import tailwindcss from "tailwindcss";
import tailwindcssNesting from "tailwindcss/nesting/index.js";

export default {
	plugins: [
		postcssImport(),
		tailwindcssNesting(),
		tailwindcss(),
		purgecss({
			content: [
				"./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
				"./public/**/*.html",
			],
			// 保护重要的类名不被删除
			safelist: [
				// 主题相关
				"dark",
				"light",
				// Swup过渡动画
				/^transition-swup-/,
				/^swup-/,
				// 动态生成的类
				/^is-/,
				/^has-/,
				// OverlayScrollbars
				/^os-/,
				// PhotoSwipe
				/^pswp/,
				// Expressive Code
				/^ec-/,
				/^expressive-code/,
				// KaTeX数学公式
				/^katex/,
				// 自定义滚动条
				/^scrollbar-/,
				// Banner相关
				"enable-banner",
				"lg:is-home",
				"navbar-hidden",
				// TOC相关
				"toc-hide",
				"toc-not-ready",
				// 浮动面板
				"float-panel-closed",
			],
			// 默认提取器 - 匹配所有可能的类名
			defaultExtractor: (content) => {
				// 匹配类名、ID和属性选择器
				const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
				const innerMatches =
					content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
				return broadMatches.concat(innerMatches);
			},
			// 仅在生产环境启用
			...(process.env.NODE_ENV === "production" ? {} : { rejected: true }),
		}),
	],
};
