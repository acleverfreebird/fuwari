import type { APIRoute } from "astro";
import { createClient } from "redis";

export const prerender = false;

async function getRedisClient() {
	const client = createClient({
		url: process.env.REDIS_URL,
	});

	client.on("error", (err) => {
		console.error("Redis Client Error:", err);
	});

	await client.connect();
	return client;
}

// 获取所有文章的总浏览量和阅读量
export const GET: APIRoute = async () => {
	try {
		const redis = await getRedisClient();

		// 获取所有 views:* 和 reads:* 的键
		const viewKeys = await redis.keys("views:*");
		const readKeys = await redis.keys("reads:*");

		// 获取所有浏览量
		let totalViews = 0;
		if (viewKeys.length > 0) {
			const viewValues = await Promise.all(
				viewKeys.map((key) => redis.get(key)),
			);
			totalViews = viewValues.reduce(
				(sum, val) => sum + Number.parseInt(val || "0", 10),
				0,
			);
		}

		// 获取所有阅读量
		let totalReads = 0;
		if (readKeys.length > 0) {
			const readValues = await Promise.all(
				readKeys.map((key) => redis.get(key)),
			);
			totalReads = readValues.reduce(
				(sum, val) => sum + Number.parseInt(val || "0", 10),
				0,
			);
		}

		await redis.quit();

		const response = {
			totalViews,
			totalReads,
			timestamp: Date.now(),
		};

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=300, s-maxage=300",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		console.error("Error fetching total stats:", error);

		return new Response(
			JSON.stringify({
				error: "Internal server error",
				totalViews: 0,
				totalReads: 0,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};

// CORS 预检请求处理
export const OPTIONS: APIRoute = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
};
