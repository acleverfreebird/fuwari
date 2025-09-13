import type { APIRoute } from "astro";
import { getCount, incrementCount } from "../../../utils/redis-client";

export const prerender = false;

// 辅助函数：规范化slug
const normalizeSlug = (slug: string | string[] | undefined): string | null => {
	if (!slug) {
		return null;
	}

	// 处理数组类型的slug (来自[...slug]路由)
	let normalizedSlug: string;
	if (Array.isArray(slug)) {
		normalizedSlug = slug.join("/");
	} else {
		normalizedSlug = slug;
	}

	// 清理slug：移除多余的斜杠和尾部斜杠
	normalizedSlug = normalizedSlug.replace(/\/+/g, "/").replace(/\/$/, "");

	return normalizedSlug || null;
};

export const GET: APIRoute = async ({ params, request }) => {
	const url = new URL(request.url);
	const type = url.searchParams.get("type") || "views";
	const slug = normalizeSlug(params.slug);

	if (!slug) {
		return new Response("Missing or invalid slug", { status: 400 });
	}

	if (!["views", "reads"].includes(type)) {
		return new Response("Invalid type parameter", { status: 400 });
	}

	try {
		const startTime = Date.now();
		const count = await getCount(`${type}:${slug}`);
		const duration = Date.now() - startTime;

		console.log(`[API] GET ${type}:${slug} = ${count} (${duration}ms)`);

		return new Response(JSON.stringify({ [type]: count }), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=60, s-maxage=60",
			},
		});
	} catch (error) {
		console.error(`[API] Error fetching ${type} for ${slug}:`, error);
		return new Response("Internal Server Error", { status: 500 });
	}
};

export const POST: APIRoute = async ({ params, request }) => {
	const url = new URL(request.url);
	const type = url.searchParams.get("type") || "views";
	const slug = normalizeSlug(params.slug);

	if (!slug) {
		return new Response("Missing or invalid slug", { status: 400 });
	}

	if (!["views", "reads"].includes(type)) {
		return new Response("Invalid type parameter", { status: 400 });
	}

	try {
		const startTime = Date.now();
		const count = await incrementCount(`${type}:${slug}`);
		const duration = Date.now() - startTime;

		console.log(`[API] POST ${type}:${slug} = ${count} (${duration}ms)`);

		return new Response(JSON.stringify({ [type]: count }), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-cache", // 防止POST响应被缓存
			},
		});
	} catch (error) {
		console.error(`[API] Error incrementing ${type} for ${slug}:`, error);
		return new Response("Internal Server Error", { status: 500 });
	}
};
