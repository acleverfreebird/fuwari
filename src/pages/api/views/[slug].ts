export const prerender = false;

import { Redis } from "@upstash/redis";
import type { APIRoute } from "astro";

console.log("[DEBUG] API: Initializing Redis connection...");
console.log(
	"[DEBUG] API: UPSTASH_REDIS_REST_URL exists:",
	!!import.meta.env.UPSTASH_REDIS_REST_URL,
);
console.log(
	"[DEBUG] API: UPSTASH_REDIS_REST_TOKEN exists:",
	!!import.meta.env.UPSTASH_REDIS_REST_TOKEN,
);

// Check if Redis is configured
const hasRedisConfig =
	import.meta.env.UPSTASH_REDIS_REST_URL &&
	import.meta.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (hasRedisConfig) {
	redis = new Redis({
		url: import.meta.env.UPSTASH_REDIS_REST_URL,
		token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
	});
}

export const GET: APIRoute = async ({ params, request }) => {
	const { slug } = params;
	const url = new URL(request.url);
	const type = url.searchParams.get("type") || "views"; // Default to 'views'

	if (!slug) {
		return new Response("Missing slug", { status: 400 });
	}

	try {
		let count = 0;

		if (redis) {
			const startTime = Date.now();
			count = (await redis.get(`${type}:${slug}`)) || 0;
			const duration = Date.now() - startTime;

			console.log(
				`[DEBUG] GET ${type}:${slug} - Count: ${count}, Duration: ${duration}ms`,
			);
		} else {
			// 返回模拟数据当Redis未配置时
			const hash =
				slug?.split("").reduce((acc, char) => {
					const newAcc = (acc << 5) - acc + char.charCodeAt(0);
					return newAcc & newAcc;
				}, 0) || 0;
			count = (Math.abs(hash) % 100) + 10; // 生成10-109之间的数字
			console.log(
				`[DEBUG] No Redis config - returning mock ${type} count: ${count} for ${slug}`,
			);
		}

		return new Response(JSON.stringify({ [type]: count }), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=60, s-maxage=60",
			},
		});
	} catch (error) {
		console.error(`Error fetching ${type}:`, error);
		return new Response("Internal Server Error", { status: 500 });
	}
};

export const POST: APIRoute = async ({ params, request }) => {
	const { slug } = params;
	const url = new URL(request.url);
	const type = url.searchParams.get("type") || "views"; // Default to 'views'

	if (!slug) {
		return new Response("Missing slug", { status: 400 });
	}

	try {
		let count = 1;

		if (redis) {
			const startTime = Date.now();
			count = await redis.incr(`${type}:${slug}`);
			const duration = Date.now() - startTime;

			console.log(
				`[DEBUG] POST ${type}:${slug} - New Count: ${count}, Duration: ${duration}ms`,
			);
		} else {
			// 当Redis未配置时返回固定值
			console.log(
				`[DEBUG] No Redis config - cannot increment ${type} count for ${slug}`,
			);
		}

		return new Response(JSON.stringify({ [type]: count }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error(`Error incrementing ${type}:`, error);
		return new Response("Internal Server Error", { status: 500 });
	}
};
