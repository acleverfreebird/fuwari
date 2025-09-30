import type { APIRoute } from "astro";
import {
	getIndexNowClient,
	isDevMode,
} from "../../utils/indexnow-optimized.js";

export const POST: APIRoute = async ({ request }) => {
	try {
		const { url, urls } = await request.json();

		if (!url && !urls) {
			return new Response(JSON.stringify({ error: "URL或URLs参数是必需的" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 在开发模式下直接返回模拟结果
		if (isDevMode()) {
			console.log(
				`[IndexNow API Dev] 模拟推送: ${url || `${urls.length} URLs`}`,
			);
			return new Response(
				JSON.stringify({
					success: true,
					submitted: url || urls,
					results: [
						{
							endpoint: "https://api.indexnow.org/indexnow",
							status: 200,
							statusText: "OK (Simulated)",
							retries: 0,
						},
					],
					totalProcessed: url ? 1 : urls.length,
					failures: 0,
					cached: 0,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// 使用优化的IndexNow客户端
		const client = getIndexNowClient();
		const result = url
			? await client.submitUrl(url)
			: await client.submitUrls(urls);

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("IndexNow API错误:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: "IndexNow提交失败",
				details: error instanceof Error ? error.message : "未知错误",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
