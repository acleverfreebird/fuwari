/**
 * Umami 统计数据代理 - Cloudflare Worker
 */

// ==================== 配置区域 ====================
const CONFIG = {
	// Umami API 地址
	UMAMI_API_URL: "https://views.freebird2913.tech/api",

	// Umami API Token (在 Umami 后台生成)
	UMAMI_API_TOKEN: "YOUR_UMAMI_API_TOKEN_HERE",

	// 网站 ID
	UMAMI_WEBSITE_ID: "726431d7-e252-486d-ab90-350313e5a519",

	// 允许的来源域名 (CORS)
	ALLOWED_ORIGINS: [
		"https://www.freebird2913.tech",
		"https://freebird2913.tech",
		"http://localhost:4321",
	],

	// 缓存时间 (秒)
	CACHE_TTL: 300, // 5分钟
};
// ==================== 配置区域结束 ====================

export default {
	async fetch(request) {
		// CORS 预检请求
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
				return await getTotalPageviews(request);
			}

			if (path === "/stats/page") {
				const pageUrl = url.searchParams.get("url");
				if (!pageUrl) {
					return jsonResponse({ error: "Missing url parameter" }, 400);
				}
				return await getPagePageviews(request, pageUrl);
			}

			if (path === "/") {
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
	const startDate = new Date("2020-01-01"); // 一个足够早的日期

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

	// Umami API 直接返回数值
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

/**
 * 获取特定页面浏览量和访客数
 */
async function getPagePageviews(request, pageUrl) {
	// 为此页面的缓存构造一个唯一的、有效的 URL
	const cacheUrl = new URL(request.url);
	cacheUrl.pathname = `/cache/page${pageUrl.startsWith("/") ? pageUrl : "/" + pageUrl}`;
	const cacheKey = new Request(cacheUrl);

	// 尝试从缓存获取
	const cached = await getCache(cacheKey);
	if (cached) {
		// 直接返回缓存的 Response 对象
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

	// Umami API 直接返回数值
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
		"Cache-Control": "public, max-age=300",
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
 * 使用 Cloudflare Cache API 进行缓存
 */
async function getCache(cacheKey) {
	const cache = caches.default;
	const response = await cache.match(cacheKey);
	if (!response) {
		return null;
	}

	// 检查缓存是否过期 (自定义头)
	const expiry = response.headers.get("Cache-Expiry");
	if (expiry && Date.now() > Number.parseInt(expiry, 10)) {
		// 异步删除过期缓存
		// 在没有 ctx.waitUntil 的情况下，这是一个即发即忘的操作
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
		"Cache-Expiry": Date.now() + ttlSeconds * 1000,
	};
	const response = new Response(responseBody, { headers });
	// 由于我们无法访问 waitUntil，我们将等待缓存操作完成。
	// 这可能会对第一个用户的响应造成轻微延迟。
	await cache.put(cacheKey, response);
}
