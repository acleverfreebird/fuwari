import { Redis } from "@upstash/redis";
import type { APIRoute } from "astro";

export const prerender = false;

const redis = new Redis({
	url: import.meta.env.UPSTASH_REDIS_REST_URL,
	token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
});

export const GET: APIRoute = async () => {
	try {
		const viewKeys = await redis.keys("views:*");
		const readKeys = await redis.keys("reads:*");
		let totalViews = 0;
		let totalReads = 0;

		if (viewKeys.length > 0) {
			const views = await redis.mget(...viewKeys);
			totalViews = (views as (string | null)[]).reduce(
				(sum: number, current: string | null) => sum + (Number(current) || 0),
				0,
			);
		}

		if (readKeys.length > 0) {
			const reads = await redis.mget(...readKeys);
			totalReads = (reads as (string | null)[]).reduce(
				(sum: number, current: string | null) => sum + (Number(current) || 0),
				0,
			);
		}

		return new Response(JSON.stringify({ totalViews, totalReads }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error fetching total views:", error);
		return new Response("Internal Server Error", { status: 500 });
	}
};
