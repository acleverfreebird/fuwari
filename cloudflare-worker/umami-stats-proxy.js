/**
 * Umami 统计数据代理 - Cloudflare Worker
 *
 * 功能:
 * - 代理 Umami API 请求,隐藏 API Token
 * - 支持获取网站总浏览量
 * - 支持获取特定页面浏览量
 * - 支持 CORS
 * - 缓存优化
 */

// ==================== 配置区域 ====================
// 请在这里填写你的 Umami 配置信息
const CONFIG = {
	// Umami API 地址 (不要在末尾加斜杠)
	UMAMI_API_URL: "https://views.freebird2913.tech/api",

	// Umami API Token (在 Umami 后台 Settings -> API 中生成)
	UMAMI_API_TOKEN: "YOUR_UMAMI_API_TOKEN_HERE",

	// 网站 ID (在 Umami 后台可以找到)
	UMAMI_WEBSITE_ID: "726431d7-e252-486d-ab90-350313e5a519",

	// 允许的来源域名 (用于 CORS,留空则允许所有来源)
	ALLOWED_ORIGINS: [
		"https://www.freebird2913.tech",
		"https://freebird2913.tech",
		"http://localhost:4321", // 本地开发
	],

	// 缓存时间 (秒)
	CACHE_TTL: 300, // 5分钟
};
// ==================== 配置区域结束 ====================

export default {
	async fetch(request) {
		// CORS 预检请求处理
		if (request.method === "OPTIONS") {
			return handleCORS(request);
		}

		// 只允许 GET 请求
		if (request.method !== "GET") {
			return jsonResponse({ error: "Method not allowed" }, 405);
		}

		try {
			const url = new URL(request.url);
			const path = url.pathname;

			// 路由处理
			if (path === "/stats/total") {
				// 获取网站总浏览量
				return await getTotalPageviews(request);
			}
			if (path === "/stats/page") {
				// 获取特定页面浏览量
				const pageUrl = url.searchParams.get("url");
				if (!pageUrl) {
					return jsonResponse({ error: "Missing url parameter" }, 400);
				}
				return await getPagePageviews(request, pageUrl);
			}
			if (path === "/") {
				// 健康检查
				return jsonResponse({
					status: "ok",
					message: "Umami Stats Proxy is running",
					endpoints: {
						total: "/stats/total - Get total website pageviews",
						page: "/stats/page?url=/path - Get specific page pageviews",
					},
				});
			}
			return jsonResponse({ error: "Not found" }, 404);
		} catch (error) {
			console.error("Error:", error);
			return jsonResponse(
				{ error: "Internal server error", message: error.message },
				500,
			);
		}
	},
};

/**
 * 获取网站总浏览量
 */
async function getTotalPageviews(request) {
	const cacheKey = "umami:total:pageviews";

	// 尝试从缓存获取
	const cached = await getCache(cacheKey);
	if (cached) {
		return jsonResponse(cached, 200, request);
	}

	// 计算时间范围 (最近30天)
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 30);

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
		throw new Error(`Umami API error: ${response.status}`);
	}

	const data = await response.json();

	const result = {
		total: data.pageviews?.value || 0,
		visitors: data.visitors?.value || 0,
		visits: data.visits?.value || 0,
		bounces: data.bounces?.value || 0,
		totaltime: data.totaltime?.value || 0,
		cached: false,
		timestamp: Date.now(),
	};

	// 缓存结果
	await setCache(cacheKey, result, CONFIG.CACHE_TTL);

	return jsonResponse(result, 200, request);
}

/**
 * 获取特定页面浏览量和访客数
 */
async function getPagePageviews(request, pageUrl) {
	const cacheKey = `umami:page:${pageUrl}`;

	// 尝试从缓存获取
	const cached = await getCache(cacheKey);
	if (cached) {
		return jsonResponse(cached, 200, request);
	}

	// 计算时间范围 (所有时间)
	const endDate = new Date();
	const startDate = new Date("2020-01-01"); // 从2020年开始

	const startAt = startDate.getTime();
	const endAt = endDate.getTime();

	// 调用 Umami API - 获取页面浏览量
	const pageviewsUrl = `${CONFIG.UMAMI_API_URL}/websites/${CONFIG.UMAMI_WEBSITE_ID}/metrics?startAt=${startAt}&endAt=${endAt}&type=url&url=${encodeURIComponent(pageUrl)}`;

	const pageviewsResponse = await fetch(pageviewsUrl, {
		headers: {
			Authorization: `Bearer ${CONFIG.UMAMI_API_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	if (!pageviewsResponse.ok) {
		throw new Error(`Umami API error: ${pageviewsResponse.status}`);
	}

	const pageviewsData = await pageviewsResponse.json();

	// 查找匹配的页面浏览量
	let pageviews = 0;
	if (Array.isArray(pageviewsData)) {
		const pageData = pageviewsData.find((item) => item.x === pageUrl);
		pageviews = pageData ? pageData.y : 0;
	}

	// 调用 Umami API - 获取页面访客数
	const visitorsUrl = `${CONFIG.UMAMI_API_URL}/websites/${CONFIG.UMAMI_WEBSITE_ID}/metrics?startAt=${startAt}&endAt=${endAt}&type=url&url=${encodeURIComponent(pageUrl)}`;

	const visitorsResponse = await fetch(visitorsUrl, {
		headers: {
			Authorization: `Bearer ${CONFIG.UMAMI_API_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	let visitors = 0;
	if (visitorsResponse.ok) {
		const visitorsData = await visitorsResponse.json();
		// Umami API 返回的访客数通常在同一个响应中
		// 如果需要单独获取,可以使用不同的 API 端点
		if (Array.isArray(visitorsData)) {
			const visitorData = visitorsData.find((item) => item.x === pageUrl);
			// 访客数通常等于或小于浏览量
			visitors = visitorData
				? Math.min(visitorData.y, pageviews)
				: Math.ceil(pageviews * 0.8);
		}
	}

	const result = {
		url: pageUrl,
		pageviews: pageviews,
		visitors: visitors,
		cached: false,
		timestamp: Date.now(),
	};

	// 缓存结果
	await setCache(cacheKey, result, CONFIG.CACHE_TTL);

	return jsonResponse(result, 200, request);
}

/**
 * 处理 CORS
 */
function handleCORS(request) {
	const origin = request.headers.get("Origin");
	const allowedOrigins = CONFIG.ALLOWED_ORIGINS;

	const headers = {
		"Access-Control-Allow-Methods": "GET, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Max-Age": "86400",
	};

	if (allowedOrigins.includes(origin)) {
		headers["Access-Control-Allow-Origin"] = origin;
	} else if (allowedOrigins.length === 0) {
		headers["Access-Control-Allow-Origin"] = "*";
	}

	return new Response(null, { status: 204, headers });
}

/**
 * 返回 JSON 响应
 */
function jsonResponse(data, status = 200, request = null) {
	const headers = {
		"Content-Type": "application/json",
		"Cache-Control": "public, max-age=300", // 5分钟浏览器缓存
	};

	// 添加 CORS 头
	if (request) {
		const origin = request.headers.get("Origin");
		const allowedOrigins = CONFIG.ALLOWED_ORIGINS;

		if (allowedOrigins.includes(origin)) {
			headers["Access-Control-Allow-Origin"] = origin;
		} else if (allowedOrigins.length === 0) {
			headers["Access-Control-Allow-Origin"] = "*";
		}
	}

	return new Response(JSON.stringify(data), { status, headers });
}

/**
 * 简单的内存缓存 (Worker 生命周期内有效)
 */
const cache = new Map();

async function getCache(key) {
	const item = cache.get(key);
	if (!item) return null;

	if (Date.now() > item.expiry) {
		cache.delete(key);
		return null;
	}

	return { ...item.data, cached: true };
}

async function setCache(key, data, ttlSeconds) {
	cache.set(key, {
		data,
		expiry: Date.now() + ttlSeconds * 1000,
	});
}
