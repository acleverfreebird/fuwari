import type { APIRoute } from "astro";
import { kvGet } from "../../../utils/redis";

// 获取文章统计数据
export const GET: APIRoute = async ({ params, request }) => {
	const { slug } = params;

	if (!slug) {
		return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const viewsKey = `views:${slug}`;
		const readsKey = `reads:${slug}`;

		const [views, reads] = await Promise.all([
			kvGet(viewsKey),
			kvGet(readsKey),
		]);

		const response = {
			slug,
			views: Number.parseInt(views || "0", 10),
			reads: Number.parseInt(reads || "0", 10),
			timestamp: Date.now(),
		};

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=60, s-maxage=60",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		console.error("Error fetching stats:", error);

		return new Response(
			JSON.stringify({
				error: "Internal server error",
				slug,
				views: 0,
				reads: 0,
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
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
};
