// 访问量系统配置
export const VIEWS_CONFIG = {
	// 环境检查
	isEnabled: () => {
		// 检查多种可能的环境变量格式
		const astroEnabled = import.meta.env.ASTRO_VIEWS_ENABLED === "true";
		const processEnabled =
			typeof process !== "undefined" &&
			process.env.ASTRO_VIEWS_ENABLED === "true";
		return astroEnabled || processEnabled;
	},

	// Redis键格式
	getViewsKey: (slug: string) => `views:${slug}`,
	getReadsKey: (slug: string) => `reads:${slug}`,

	// 缓存配置
	CACHE_HEADERS: {
		GET: "public, max-age=60, s-maxage=60",
		TOTAL: "public, max-age=300, s-maxage=300",
		POST: "no-cache",
	},

	// 时间配置 (毫秒)
	TIMERS: {
		READ_DELAY: 2000, // 2秒后计算阅读量
		DISPLAY_UPDATE: 500, // 页面加载后500ms更新显示
		VISIBILITY_UPDATE: 100, // 页面重新可见后100ms更新显示
	},

	// 日志前缀
	LOG_PREFIX: {
		REDIS: "[REDIS]",
		API: "[API]",
		SSR: "[SSR]",
		VIEWS: "[VIEWS]",
		READS: "[READS]",
		DISPLAY: "[DISPLAY]",
		PAGE: "[PAGE]",
		NETLIFY: "[NETLIFY]",
	},
};

// 辅助函数：规范化slug
export const normalizeSlug = (
	slug: string | string[] | undefined,
): string | null => {
	if (!slug) return null;

	let normalizedSlug: string;
	if (Array.isArray(slug)) {
		normalizedSlug = slug.join("/");
	} else {
		normalizedSlug = slug;
	}

	// 清理slug：移除多余的斜杠和尾部斜杠
	normalizedSlug = normalizedSlug.replace(/\/+/g, "/").replace(/\/$/, "");

	return normalizedSlug || null;
};

// 验证计数类型
export const isValidCountType = (type: string): type is "views" | "reads" => {
	return ["views", "reads"].includes(type);
};

// 生成模拟数据（当Redis不可用时）
export const generateMockCount = (key: string): number => {
	const hash = key.split("").reduce((acc, char) => {
		const newAcc = (acc << 5) - acc + char.charCodeAt(0);
		return newAcc & newAcc;
	}, 0);
	return (Math.abs(hash) % 100) + 10; // 10-109之间的数字
};
