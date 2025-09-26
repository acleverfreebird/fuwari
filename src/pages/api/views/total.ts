import { Redis } from "@upstash/redis";
import type { APIRoute } from "astro";

export const prerender = false;

console.log("[DEBUG] Total API: Initializing Redis connection...");
console.log(
	"[DEBUG] Total API: UPSTASH_REDIS_REST_URL exists:",
	!!import.meta.env.UPSTASH_REDIS_REST_URL,
);
console.log(
	"[DEBUG] Total API: UPSTASH_REDIS_REST_TOKEN exists:",
	!!import.meta.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = new Redis({
	url: import.meta.env.UPSTASH_REDIS_REST_URL,
	token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
});

export const GET: APIRoute = async () => {
	try {
		const startTime = Date.now();
		console.log("[DEBUG] Starting total count calculation...");

		// 使用缓存键避免重复计算
		const cacheKey = "cached:totals:v1";
		const cacheExpiry = 60; // 1分钟缓存

		// 尝试从缓存获取数据
		let cachedData = null;
		if (redis) {
			try {
				cachedData = await redis.get(cacheKey);
			} catch (cacheError) {
				console.warn("[DEBUG] Cache read failed:", cacheError);
			}
		}

		if (cachedData) {
			const parsedData = JSON.parse(cachedData as string);
			console.log(
				`[DEBUG] Cache hit, returning cached data: ${Date.now() - startTime}ms`,
			);
			return new Response(JSON.stringify(parsedData), {
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
					"X-Cache": "HIT",
				},
			});
		}

		let totalViews = 0;
		let totalReads = 0;

		if (redis) {
			try {
				// 使用SCAN代替KEYS以提高性能
				let cursor: string | number = 0;
				let viewKeys: string[] = [];
				let readKeys: string[] = [];

				// 扫描views keys
				do {
					// @ts-ignore - Redis scan type definitions
					const [nextCursor, keys] = await redis.scan(cursor, {
						match: "views:*",
						count: 100,
					});
					cursor = nextCursor;
					viewKeys = viewKeys.concat(keys);
				} while (cursor !== 0);

				// 扫描reads keys
				cursor = 0;
				do {
					// @ts-ignore - Redis scan type definitions
					const [nextCursor, keys] = await redis.scan(cursor, {
						match: "reads:*",
						count: 100,
					});
					cursor = nextCursor;
					readKeys = readKeys.concat(keys);
				} while (cursor !== 0);

				console.log(
					`[DEBUG] Found keys - Views: ${viewKeys.length}, Reads: ${readKeys.length}`,
				);

				// 批量获取数据
				if (viewKeys.length > 0) {
					const views = await redis.mget(...viewKeys);
					totalViews = (views as (string | null)[]).reduce(
						(sum: number, current: string | null) =>
							sum + (Number(current) || 0),
						0,
					);
				}

				if (readKeys.length > 0) {
					const reads = await redis.mget(...readKeys);
					totalReads = (reads as (string | null)[]).reduce(
						(sum: number, current: string | null) =>
							sum + (Number(current) || 0),
						0,
					);
				}

				// 缓存结果
				const resultData = { totalViews, totalReads };
				await redis.setex(cacheKey, cacheExpiry, JSON.stringify(resultData));
				console.log(`[DEBUG] Data cached for ${cacheExpiry}s`);
			} catch (redisError) {
				console.error("[DEBUG] Redis operation failed:", redisError);
				// 降级到模拟数据
				totalViews = 1234;
				totalReads = 567;
			}
		} else {
			// 当Redis未配置时返回模拟数据
			totalViews = 1234;
			totalReads = 567;
			console.log(
				`[DEBUG] No Redis config - returning mock totals: views=${totalViews}, reads=${totalReads}`,
			);
		}

		const totalDuration = Date.now() - startTime;
		console.log(`[DEBUG] Total API call duration: ${totalDuration}ms`);

		return new Response(JSON.stringify({ totalViews, totalReads }), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
				"X-Cache": "MISS",
			},
		});
	} catch (error) {
		console.error("Error fetching total views:", error);
		return new Response("Internal Server Error", { status: 500 });
	}
};
