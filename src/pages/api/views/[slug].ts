import type { APIRoute } from "astro";
import { kvGet, kvIncr, kvSet } from "../../../utils/redis";

export const prerender = false;

// 生成用户会话标识
function getSessionId(request: Request): string {
	const userAgent = request.headers.get("user-agent") || "";
	const ip =
		request.headers.get("x-forwarded-for") ||
		request.headers.get("x-real-ip") ||
		"unknown";

	return btoa(`${ip}:${userAgent.slice(0, 50)}`).slice(0, 20);
}

// 检查是否可以计数（防重复）
async function canCount(
	sessionId: string,
	slug: string,
	type: "view" | "read",
): Promise<boolean> {
	const key = `user:${sessionId}:${slug}:${type}`;
	const lastTime = await kvGet(key);

	if (!lastTime) {
		return true;
	}

	const now = Date.now();
	const lastTimestamp = Number.parseInt(lastTime, 10);

	// 访问量：24小时内不重复计数
	const cooldownPeriod = 24 * 60 * 60 * 1000;

	return now - lastTimestamp > cooldownPeriod;
}

// 记录计数时间
async function recordCount(
	sessionId: string,
	slug: string,
	type: "view" | "read",
): Promise<void> {
	const key = `user:${sessionId}:${slug}:${type}`;
	await kvSet(key, Date.now().toString());
}

// 增加访问量
export const POST: APIRoute = async ({ params, request }) => {
	const { slug } = params;

	if (!slug) {
		return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const sessionId = getSessionId(request);

		// 检查是否可以增加计数（防重复）
		const canIncrement = await canCount(sessionId, slug, "view");

		if (!canIncrement) {
			// 返回当前计数，但不增加
			const viewsKey = `views:${slug}`;
			const currentViews = await kvGet(viewsKey);

			return new Response(
				JSON.stringify({
					slug,
					views: Number.parseInt(currentViews || "0", 10),
					incremented: false,
					reason: "Already counted within 24 hours",
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "no-cache",
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
		}

		// 增加访问量
		const viewsKey = `views:${slug}`;
		const newViews = await kvIncr(viewsKey);

		// 记录计数时间
		await recordCount(sessionId, slug, "view");

		return new Response(
			JSON.stringify({
				slug,
				views: newViews,
				incremented: true,
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-cache",
					"Access-Control-Allow-Origin": "*",
				},
			},
		);
	} catch (error) {
		console.error("Error incrementing views:", error);

		return new Response(
			JSON.stringify({
				error: "Internal server error",
				slug,
				incremented: false,
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
