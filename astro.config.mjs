import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { expressiveCodeConfig } from "./src/config.ts";
import { pluginCodeBlockCollapse } from "./src/plugins/expressive-code/code-block-collapse.ts";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";

// https://astro.build/config
export default defineConfig({
	site: "https://www.freebird2913.tech/",
	base: "/",
	trailingSlash: "always",

	// 确保manifest.json被复制到构建目录
	publicDir: "./public",

	integrations: [
		tailwind({
			nesting: true,
		}),
		swup({
			theme: false,
			animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
			// the default value `transition-` cause transition delay
			// when the Tailwind class `transition-all` is used
			containers: ["main", "#toc"],
			smoothScrolling: true,
			cache: true,
			preload: true,
			accessibility: true,
			updateHead: true,
			updateBodyClass: false,
			globalInstance: true,
		}),
		icon({
			include: {
				"material-symbols": ["*"],
				"fa6-brands": ["*"],
				"fa6-regular": ["*"],
				"fa6-solid": ["*"],
			},
		}),
		expressiveCode({
			themes: [expressiveCodeConfig.theme],
			plugins: [
				pluginCodeBlockCollapse({
					collapseAfter: 15, // 从20降到15行，减少初始渲染
					defaultCollapsed: true, // 默认折叠长代码块
				}),
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				pluginLanguageBadge(),
				pluginCustomCopyButton(),
			],
			defaultProps: {
				wrap: true,
				overridesByLang: {
					shellsession: {
						showLineNumbers: false,
					},
					// 将自定义语言映射到现有语言
					sudoers: {
						showLineNumbers: true,
					},
					conf: {
						showLineNumbers: true,
					},
					environment: {
						showLineNumbers: true,
					},
				},
			},
			// 包含支持的语言
			langs: [
				"bash",
				"shell",
				"ini",
				"properties",
				"json",
				"yaml",
				"toml",
				"txt",
				// 添加常用的配置文件语言
				"diff",
				"log",
			],
			styleOverrides: {
				codeBackground: "var(--codeblock-bg)",
				borderRadius: "0.75rem",
				borderColor: "none",
				codeFontSize: "0.875rem",
				codeFontFamily:
					"'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {
					editorBackground: "var(--codeblock-bg)",
					terminalBackground: "var(--codeblock-bg)",
					terminalTitlebarBackground: "var(--codeblock-topbar-bg)",
					editorTabBarBackground: "var(--codeblock-topbar-bg)",
					editorActiveTabBackground: "none",
					editorActiveTabIndicatorBottomColor: "var(--primary)",
					editorActiveTabIndicatorTopColor: "none",
					editorTabBarBorderBottomColor: "var(--codeblock-topbar-bg)",
					terminalTitlebarBorderBottomColor: "none",
				},
				textMarkers: {
					delHue: 0,
					insHue: 180,
					markHue: 250,
				},
			},
			frames: {
				showCopyToClipboardButton: false,
			},
		}),
		svelte(),
		sitemap(),
	],

	markdown: {
		remarkPlugins: [
			remarkMath,
			remarkReadingTime,
			remarkExcerpt,
			remarkGithubAdmonitionsToDirectives,
			remarkDirective,
			remarkSectionize,
			parseDirectiveNode,
		],
		rehypePlugins: [
			rehypeKatex,
			rehypeSlug,
			[
				rehypeComponents,
				{
					components: {
						github: GithubCardComponent,
						note: (x, y) => AdmonitionComponent(x, y, "note"),
						tip: (x, y) => AdmonitionComponent(x, y, "tip"),
						important: (x, y) => AdmonitionComponent(x, y, "important"),
						caution: (x, y) => AdmonitionComponent(x, y, "caution"),
						warning: (x, y) => AdmonitionComponent(x, y, "warning"),
					},
				},
			],
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: {
						className: ["anchor"],
					},
					content: {
						type: "element",
						tagName: "span",
						properties: {
							className: ["anchor-icon"],
							"data-pagefind-ignore": true,
						},
						children: [
							{
								type: "text",
								value: "#",
							},
						],
					},
				},
			],
		],
	},

	vite: {
		build: {
			cssMinify: true, // 使用默认的esbuild，更稳定
			minify: "terser",
			terserOptions: {
				compress: {
					drop_console: true,
					drop_debugger: true,
				},
			},
			rollupOptions: {
				output: {
					// 优化代码分割 - 合并Swup相关模块减少网络依赖链
					manualChunks: (id) => {
						// 合并所有Swup相关模块到一个chunk
						if (id.includes("@swup/") || id.includes("swup")) {
							return "swup-bundle";
						}
						// UI组件库
						if (id.includes("photoswipe") || id.includes("overlayscrollbars")) {
							return "ui-components";
						}
						// Svelte相关
						if (id.includes("svelte")) {
							return "svelte-runtime";
						}
						// Iconify
						if (id.includes("@iconify")) {
							return "iconify";
						}
						// 其他node_modules作为vendor
						if (id.includes("node_modules")) {
							return "vendor";
						}
					},
				},
				onwarn(warning, warn) {
					// temporarily suppress this warning
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
		},
		// 添加构建后IndexNow推送钩子
		plugins: [
			{
				name: "indexnow-submit",
				buildEnd() {
					// 仅在生产构建时提示
					if (process.env.NODE_ENV === "production") {
						console.log("[IndexNow] 构建完成，自动推送功能已准备就绪");
						console.log(
							'[IndexNow] 使用 "npm run indexnow:submit" 来手动推送所有页面到搜索引擎',
						);
					}
				},
			},
		],
	},

	adapter: vercel(),

	// 图片优化配置
	image: {
		service: {
			entrypoint: "astro/assets/services/sharp",
		},
		domains: ["www.freebird2913.tech"],
	},

	// 输出优化
	compressHTML: true,
	build: {
		inlineStylesheets: "always", // 内联小CSS文件以减少HTTP请求
	},
});
