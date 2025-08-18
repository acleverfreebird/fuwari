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

		const keysStartTime = Date.now();
		const viewKeys = await redis.keys("views:*");
		const readKeys = await redis.keys("reads:*");
		const keysDuration = Date.now() - keysStartTime;

		console.log(
			`[DEBUG] Found keys - Views: ${viewKeys.length}, Reads: ${readKeys.length}, Keys query took: ${keysDuration}ms`,
		);

		let totalViews = 0;
		let totalReads = 0;

		if (viewKeys.length > 0) {
			const viewsStartTime = Date.now();
			const views = await redis.mget(...viewKeys);
			const viewsDuration = Date.now() - viewsStartTime;

			totalViews = (views as (string | null)[]).reduce(
				(sum: number, current: string | null) => sum + (Number(current) || 0),
				0,
			);

			console.log(
				`[DEBUG] Views calculation took: ${viewsDuration}ms, Total views: ${totalViews}`,
			);
		}

		if (readKeys.length > 0) {
			const readsStartTime = Date.now();
			const reads = await redis.mget(...readKeys);
			const readsDuration = Date.now() - readsStartTime;

			totalReads = (reads as (string | null)[]).reduce(
				(sum: number, current: string | null) => sum + (Number(current) || 0),
				0,
			);

			console.log(
				`[DEBUG] Reads calculation took: ${readsDuration}ms, Total reads: ${totalReads}`,
			);
		}

		const totalDuration = Date.now() - startTime;
		console.log(`[DEBUG] Total API call duration: ${totalDuration}ms`);

		return new Response(JSON.stringify({ totalViews, totalReads }), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=300, s-maxage=300",
			},
		});
	} catch (error) {
		console.error("Error fetching total views:", error);
		return new Response("Internal Server Error", { status: 500 });
	}
};
