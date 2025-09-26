// IndexNow 自动推送工具函数
import type { CollectionEntry } from "astro:content";

// 网站URL - 硬编码站点URL
const SITE_URL = "https://www.freebird2913.tech";

// IndexNow API 密钥
const INDEXNOW_KEY = "f494d9ef355649f38fb34bf5740376c8";

// IndexNow API 端点
const INDEXNOW_ENDPOINTS = [
	"https://api.indexnow.org/indexnow",
	"https://www.bing.com/indexnow",
	"https://yandex.com/indexnow",
];

export interface IndexNowResponse {
	success: boolean;
	submitted: string | string[];
	results: Array<{
		endpoint?: string;
		status?: number;
		statusText?: string;
		error?: unknown;
	}>;
}

/**
 * 向搜索引擎推送单个URL
 */
export async function submitUrlToIndexNow(
	url: string,
): Promise<IndexNowResponse> {
	const payload = {
		host: new URL(SITE_URL).hostname,
		key: INDEXNOW_KEY,
		keyLocation: `${SITE_URL}/f494d9ef355649f38fb34bf5740376c8.txt`,
		url: url,
	};

	console.log(`[IndexNow] 推送URL: ${url}`);

	// 向多个搜索引擎提交
	const results = await Promise.allSettled(
		INDEXNOW_ENDPOINTS.map(async (endpoint) => {
			try {
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
			} catch (error) {
				console.error(`[IndexNow] 推送到 ${endpoint} 失败:`, error);
				throw error;
			}
		}),
	);

	return {
		success: true,
		submitted: url,
		results: results.map((result) =>
			result.status === "fulfilled" ? result.value : { error: result.reason },
		),
	};
}

/**
 * 向搜索引擎推送多个URL
 */
export async function submitUrlsToIndexNow(
	urls: string[],
): Promise<IndexNowResponse> {
	if (urls.length === 0) {
		throw new Error("URLs列表不能为空");
	}

	const payload = {
		host: new URL(SITE_URL).hostname,
		key: INDEXNOW_KEY,
		keyLocation: `${SITE_URL}/f494d9ef355649f38fb34bf5740376c8.txt`,
		urlList: urls,
	};

	console.log(`[IndexNow] 批量推送 ${urls.length} 个URL`);

	// 向多个搜索引擎提交
	const results = await Promise.allSettled(
		INDEXNOW_ENDPOINTS.map(async (endpoint) => {
			try {
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
			} catch (error) {
				console.error(`[IndexNow] 推送到 ${endpoint} 失败:`, error);
				throw error;
			}
		}),
	);

	return {
		success: true,
		submitted: urls,
		results: results.map((result) =>
			result.status === "fulfilled" ? result.value : { error: result.reason },
		),
	};
}

/**
 * 从文章条目生成完整URL
 */
export function getPostUrlFromEntry(entry: CollectionEntry<"posts">): string {
	return new URL(`posts/${entry.slug}/`, SITE_URL).href;
}

/**
 * 推送文章到搜索引擎
 */
export async function submitPostToIndexNow(
	entry: CollectionEntry<"posts">,
): Promise<IndexNowResponse> {
	const url = getPostUrlFromEntry(entry);
	return await submitUrlToIndexNow(url);
}

/**
 * 批量推送多篇文章到搜索引擎
 */
export async function submitPostsToIndexNow(
	entries: CollectionEntry<"posts">[],
): Promise<IndexNowResponse> {
	const urls = entries.map((entry) => getPostUrlFromEntry(entry));
	return await submitUrlsToIndexNow(urls);
}

/**
 * 推送站点重要页面到搜索引擎
 */
export async function submitSitePagesToIndexNow(): Promise<IndexNowResponse> {
	const importantPages = [
		new URL("/", SITE_URL).href, // 首页
		new URL("/about/", SITE_URL).href, // 关于页面
		new URL("/friends/", SITE_URL).href, // 友链页面
		new URL("/archive/", SITE_URL).href, // 归档页面
	];

	return await submitUrlsToIndexNow(importantPages);
}

/**
 * 在开发模式下模拟推送（不实际发送请求）
 */
export async function submitUrlToIndexNowDev(
	url: string,
): Promise<IndexNowResponse> {
	console.log(`[IndexNow Dev] 模拟推送URL: ${url}`);

	return {
		success: true,
		submitted: url,
		results: INDEXNOW_ENDPOINTS.map((endpoint) => ({
			endpoint,
			status: 200,
			statusText: "OK (Simulated)",
		})),
	};
}

/**
 * 检查是否在开发环境
 */
export function isDevMode(): boolean {
	// 在Astro中检查环境
	if (typeof import.meta !== "undefined" && import.meta.env) {
		return import.meta.env.DEV === true;
	}
	// 在Node.js中检查环境
	if (typeof process !== "undefined" && process?.env) {
		return process.env.NODE_ENV === "development";
	}
	// 默认返回false（生产环境）
	return false;
}

/**
 * 智能推送函数 - 根据环境决定是否实际推送
 */
export async function smartSubmitUrl(url: string): Promise<IndexNowResponse> {
	if (isDevMode()) {
		return await submitUrlToIndexNowDev(url);
	}
	return await submitUrlToIndexNow(url);
}

/**
 * 智能推送文章函数 - 根据环境决定是否实际推送
 */
export async function smartSubmitPost(
	entry: CollectionEntry<"posts">,
): Promise<IndexNowResponse> {
	const url = getPostUrlFromEntry(entry);
	if (isDevMode()) {
		return await submitUrlToIndexNowDev(url);
	}
	return await submitUrlToIndexNow(url);
}
