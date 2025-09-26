import type { APIRoute } from "astro";

// IndexNow API 密钥
const INDEXNOW_KEY = "f494d9ef355649f38fb34bf5740376c8";

// IndexNow API 端点
const INDEXNOW_ENDPOINTS = [
	"https://api.indexnow.org/indexnow",
	"https://www.bing.com/indexnow",
	"https://yandex.com/indexnow",
];

export const POST: APIRoute = async ({ request }) => {
	try {
		const { url, urls } = await request.json();

		if (!url && !urls) {
			return new Response(JSON.stringify({ error: "URL或URLs参数是必需的" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const payload = {
			host: "www.freebird2913.tech",
			key: INDEXNOW_KEY,
			keyLocation:
				"https://www.freebird2913.tech/f494d9ef355649f38fb34bf5740376c8.txt",
			...(url ? { url } : { urlList: urls }),
		};

		// 向多个搜索引擎提交
		const results = await Promise.allSettled(
			INDEXNOW_ENDPOINTS.map(async (endpoint) => {
				const response = await fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				});

				return {
					endpoint,
					status: response.status,
					statusText: response.statusText,
				};
			}),
		);

		return new Response(
			JSON.stringify({
				success: true,
				submitted: url || urls,
				results: results.map((result) =>
					result.status === "fulfilled"
						? result.value
						: { error: result.reason },
				),
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("IndexNow API错误:", error);
		return new Response(
			JSON.stringify({
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
