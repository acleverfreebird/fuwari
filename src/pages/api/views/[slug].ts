import { Redis } from "@upstash/redis";
import type { APIRoute } from "astro";

const redis = new Redis({
	url: import.meta.env.UPSTASH_REDIS_REST_URL,
	token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
});

export const GET: APIRoute = async ({ params }) => {
	const { slug } = params;

	if (!slug) {
		return new Response("Missing slug", { status: 400 });
	}

	try {
		const views = (await redis.get(`views:${slug}`)) || 0;
		return new Response(JSON.stringify({ views }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error fetching views:", error);
		return new Response("Internal Server Error", { status: 500 });
	}
};
