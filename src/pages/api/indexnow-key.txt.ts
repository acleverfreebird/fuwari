import type { APIRoute } from "astro";

// IndexNow API 密钥
const INDEXNOW_KEY = "f494d9ef355649f38fb34bf5740376c8";

export const GET: APIRoute = () => {
	return new Response(INDEXNOW_KEY, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
