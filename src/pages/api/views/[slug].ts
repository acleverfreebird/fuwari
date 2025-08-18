export const prerender = false;

import { Redis } from "@upstash/redis";
import type { APIRoute } from "astro";

const redis = new Redis({
	url: import.meta.env.UPSTASH_REDIS_REST_URL,
	token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
});

export const GET: APIRoute = async ({ params, request }) => {
	const { slug } = params;
	const url = new URL(request.url);
	const type = url.searchParams.get("type") || "views"; // Default to 'views'

	if (!slug) {
		return new Response("Missing slug", { status: 400 });
	}

	try {
		const startTime = Date.now();
		const count = (await redis.get(`${type}:${slug}`)) || 0;
		const duration = Date.now() - startTime;

		console.log(
			`[DEBUG] GET ${type}:${slug} - Count: ${count}, Duration: ${duration}ms`,
		);

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
		const startTime = Date.now();
		const count = await redis.incr(`${type}:${slug}`);
		const duration = Date.now() - startTime;

		console.log(
			`[DEBUG] POST ${type}:${slug} - New Count: ${count}, Duration: ${duration}ms`,
		);

		return new Response(JSON.stringify({ [type]: count }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error(`Error incrementing ${type}:`, error);
		return new Response("Internal Server Error", { status: 500 });
	}
};
