import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
	UmamiConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "free bird",
	subtitle: "free bird个人博客",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "assets/images/banner.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		mobilePosition: "center", // Mobile-specific position, defaults to 'center' for better mobile display
		tabletPosition: "center", // Tablet-specific position, defaults to 'center' for tablet devices
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "https://www.freebird2913.tech", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		{
			src: "/favicon/favicon-light-32.png",
			sizes: "32x32",
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Friends,
		LinkPreset.Archive,
		LinkPreset.Gallery,
		LinkPreset.Music,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/acleverfreebird/fuwari", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "free bird",
	bio: "一个碌碌无为的高中生",
	links: [
		{
			name: "Steam",
			icon: "fa6-brands:steam",
			url: "https://store.steampowered.com",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/acleverfreebird",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

export const umamiConfig: UmamiConfig = {
	enable: true,
	src: "https://views.freebird2913.tech/script.js",
	websiteId: "726431d7-e252-486d-ab90-350313e5a519",
	domains: "www.freebird2913.tech", // 可选,限制只在此域名追踪
	autoTrack: true,
	delayLoad: 2000, // 2秒后加载,优化首屏性能
};

// Umami 统计 API 配置 (通过 Cloudflare Worker 代理)
export const umamiStatsConfig = {
	enable: true, // 是否启用浏览量显示
	apiUrl: "https://get-views.freebird2913.tech", // Cloudflare Worker 地址
};

// Waline 评论系统配置
export const walineConfig = {
	enable: true, // 是否启用 Waline 评论系统
	serverURL: "https://waline.freebird2913.tech/", // Waline 服务器地址
	lang: "zh-CN", // 语言设置
	meta: ["nick", "mail", "link"], // 评论者信息字段
	requiredMeta: ["nick"], // 必填字段
	pageSize: 10, // 每页评论数
	wordLimit: [0, 1000], // 评论字数限制
	emoji: [
		"https://unpkg.com/@waline/emojis@1.2.0/weibo",
		"https://unpkg.com/@waline/emojis@1.2.0/alus",
		"https://unpkg.com/@waline/emojis@1.2.0/bilibili",
	], // 表情包配置
	pageview: true, // 是否启用浏览量统计
	comment: true, // 是否启用评论
};
