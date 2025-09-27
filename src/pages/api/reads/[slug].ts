import type { APIRoute } from "astro";
import { kvGet, kvIncr, kvSet } from "../../../utils/redis";

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
async function canCount(sessionId: string, slug: string): Promise<boolean> {
	const key = `user:${sessionId}:${slug}:read`;
	const lastTime = await kvGet(key);

	// 阅读量：每次会话只计算一次，直到清除缓存
	return lastTime === null;
}

// 记录计数时间
async function recordCount(sessionId: string, slug: string): Promise<void> {
	const key = `user:${sessionId}:${slug}:read`;
	await kvSet(key, Date.now().toString());
}

// 增加阅读量
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
		const canIncrement = await canCount(sessionId, slug);

		if (!canIncrement) {
			// 返回当前计数，但不增加
			const readsKey = `reads:${slug}`;
			const currentReads = await kvGet(readsKey);

			return new Response(
				JSON.stringify({
					slug,
					reads: Number.parseInt(currentReads || "0", 10),
					incremented: false,
					reason: "Already read in this session",
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

		// 增加阅读量
		const readsKey = `reads:${slug}`;
		const newReads = await kvIncr(readsKey);

		// 记录计数时间
		await recordCount(sessionId, slug);

		return new Response(
			JSON.stringify({
				slug,
				reads: newReads,
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
		console.error("Error incrementing reads:", error);

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
