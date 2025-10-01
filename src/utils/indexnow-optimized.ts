// 优化的 IndexNow 推送工具
import type { CollectionEntry } from "astro:content";
import {
	getIndexNowConfig,
	type IndexNowConfig,
	validateConfig,
} from "../config/indexnow-config.ts";

export interface IndexNowResponse {
	success: boolean;
	submitted: string | string[];
	results: Array<{
		endpoint?: string;
		status?: number;
		statusText?: string;
		error?: unknown;
		retries?: number;
	}>;
	totalProcessed: number;
	failures: number;
	cached: number;
}

export interface IndexNowError extends Error {
	code: string;
	endpoint?: string;
	retryable: boolean;
}

// URL缓存管理
class URLCache {
	private cache = new Map<string, number>();
	private config: IndexNowConfig;

	constructor(config: IndexNowConfig) {
		this.config = config;
	}

	has(url: string): boolean {
		if (!this.config.caching.enabled) return false;

		const timestamp = this.cache.get(url);
		if (!timestamp) return false;

		const now = Date.now();
		if (now - timestamp > this.config.caching.cacheDuration) {
			this.cache.delete(url);
			return false;
		}

		return true;
	}

	add(url: string): void {
		if (this.config.caching.enabled) {
			this.cache.set(url, Date.now());
		}
	}

	addBatch(urls: string[]): void {
		if (this.config.caching.enabled) {
			const timestamp = Date.now();
			for (const url of urls) {
				this.cache.set(url, timestamp);
			}
		}
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}
}

// 请求频率限制
class RateLimiter {
	private requests: number[] = [];
	private config: IndexNowConfig;

	constructor(config: IndexNowConfig) {
		this.config = config;
	}

	async checkLimit(): Promise<void> {
		const now = Date.now();
		const oneMinuteAgo = now - 60000;

		// 清理一分钟前的请求记录
		this.requests = this.requests.filter((time) => time > oneMinuteAgo);

		if (this.requests.length >= this.config.rateLimiting.maxRequestsPerMinute) {
			const oldestRequest = Math.min(...this.requests);
			const waitTime = 60000 - (now - oldestRequest);

			if (waitTime > 0) {
				console.log(
					`[IndexNow] 达到频率限制，等待 ${Math.ceil(waitTime / 1000)} 秒...`,
				);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}
		}

		this.requests.push(now);
	}
}

// 优化的 IndexNow 客户端
export class OptimizedIndexNowClient {
	private config: IndexNowConfig;
	private cache: URLCache;
	private rateLimiter: RateLimiter;

	constructor(config?: Partial<IndexNowConfig>) {
		this.config = { ...getIndexNowConfig(), ...config };

		if (!validateConfig(this.config)) {
			throw new Error("IndexNow 配置无效");
		}

		this.cache = new URLCache(this.config);
		this.rateLimiter = new RateLimiter(this.config);
	}

	/**
	 * 延迟函数
	 */
	private async delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * 计算重试延迟时间（指数退避）
	 */
	private calculateRetryDelay(attempt: number): number {
		const delay =
			this.config.retryConfig.initialDelay *
			this.config.retryConfig.backoffFactor ** attempt;
		return Math.min(delay, this.config.retryConfig.maxDelay);
	}

	/**
	 * 判断错误是否可重试
	 */
	private isRetryableError(
		error: unknown,
	): error is { code?: string; status?: number } {
		if (typeof error === "object" && error !== null) {
			const err = error as { code?: string; status?: number };
			// 网络错误通常可重试
			if (
				err.code === "ENOTFOUND" ||
				err.code === "ECONNRESET" ||
				err.code === "ETIMEDOUT"
			) {
				return true;
			}

			// HTTP状态码判断
			if (err.status) {
				// 5xx 服务器错误可重试
				if (err.status >= 500 && err.status < 600) return true;
				// 429 请求过于频繁可重试
				if (err.status === 429) return true;
				// 408 请求超时可重试
				if (err.status === 408) return true;
			}
		}

		return false;
	}

	/**
	 * 带重试的HTTP请求
	 */
	private async fetchWithRetry(
		endpoint: string,
		payload: unknown,
		maxRetries: number = this.config.retryConfig.maxRetries,
	): Promise<{
		endpoint: string;
		status: number;
		statusText: string;
		retries: number;
	}> {
		let lastError: unknown;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"User-Agent":
							"IndexNow-Client/1.0 (+https://www.freebird2913.tech/)",
					},
					body: JSON.stringify(payload),
					// 添加超时
					signal: AbortSignal.timeout(30000), // 30秒超时
				});

				// 检查响应状态
				if (!response.ok) {
					const error: {
						status: number;
						statusText: string;
						endpoint: string;
						message: string;
					} = {
						message: `HTTP ${response.status}: ${response.statusText}`,
						status: response.status,
						statusText: response.statusText,
						endpoint: endpoint,
					};

					if (!this.isRetryableError(error) || attempt === maxRetries) {
						throw error;
					}

					console.warn(
						`[IndexNow] ${endpoint} 请求失败 (尝试 ${attempt + 1}/${maxRetries + 1}): ${error.message}`,
					);
					lastError = error;

					// 等待后重试
					if (attempt < maxRetries) {
						const delayMs = this.calculateRetryDelay(attempt);
						await this.delay(delayMs);
					}
					continue;
				}

				return {
					endpoint,
					status: response.status,
					statusText: response.statusText,
					retries: attempt,
				};
			} catch (error: unknown) {
				lastError = error;

				if (!this.isRetryableError(error) || attempt === maxRetries) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					console.error(`[IndexNow] ${endpoint} 最终失败:`, errorMessage);
					throw error;
				}

				const warnMessage =
					error instanceof Error ? error.message : String(error);
				console.warn(
					`[IndexNow] ${endpoint} 请求失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`,
					warnMessage,
				);

				if (attempt < maxRetries) {
					const delayMs = this.calculateRetryDelay(attempt);
					await this.delay(delayMs);
				}
			}
		}

		throw lastError;
	}

	/**
	 * 去重URL列表
	 */
	private deduplicateUrls(urls: string[]): {
		unique: string[];
		duplicates: number;
	} {
		const seen = new Set<string>();
		const unique: string[] = [];

		for (const url of urls) {
			if (!seen.has(url)) {
				seen.add(url);
				unique.push(url);
			}
		}

		return {
			unique,
			duplicates: urls.length - unique.length,
		};
	}

	/**
	 * 过滤已缓存的URL
	 */
	private filterCachedUrls(urls: string[]): { new: string[]; cached: number } {
		const newUrls: string[] = [];
		let cached = 0;

		for (const url of urls) {
			if (this.cache.has(url)) {
				cached++;
			} else {
				newUrls.push(url);
			}
		}

		return { new: newUrls, cached };
	}

	/**
	 * 分批处理URL
	 */
	private chunkUrls(urls: string[], chunkSize: number): string[][] {
		const chunks: string[][] = [];
		for (let i = 0; i < urls.length; i += chunkSize) {
			chunks.push(urls.slice(i, i + chunkSize));
		}
		return chunks;
	}

	/**
	 * 推送单个URL
	 */
	async submitUrl(url: string): Promise<IndexNowResponse> {
		// 检查缓存
		if (this.cache.has(url)) {
			console.log(`[IndexNow] URL已在缓存中，跳过推送: ${url}`);
			return {
				success: true,
				submitted: url,
				results: [],
				totalProcessed: 1,
				failures: 0,
				cached: 1,
			};
		}

		const payload = {
			host: new URL(this.config.siteUrl).hostname,
			key: this.config.apiKey,
			keyLocation: this.config.keyLocation,
			url: url,
		};

		console.log(`[IndexNow] 推送URL: ${url}`);

		// 检查频率限制
		await this.rateLimiter.checkLimit();

		// 向多个搜索引擎提交
		const results = await Promise.allSettled(
			this.config.endpoints.map((endpoint) =>
				this.fetchWithRetry(endpoint, payload),
			),
		);

		const processedResults = results.map((result) =>
			result.status === "fulfilled" ? result.value : { error: result.reason },
		);

		const failures = processedResults.filter((r) => "error" in r).length;
		const success = failures < this.config.endpoints.length;

		// 如果至少有一个成功，则缓存URL
		if (success) {
			this.cache.add(url);
		}

		return {
			success,
			submitted: url,
			results: processedResults,
			totalProcessed: 1,
			failures,
			cached: 0,
		};
	}

	/**
	 * 批量推送URL
	 */
	async submitUrls(urls: string[]): Promise<IndexNowResponse> {
		if (urls.length === 0) {
			throw new Error("URLs列表不能为空");
		}

		// 去重
		const { unique: uniqueUrls, duplicates } = this.deduplicateUrls(urls);
		if (duplicates > 0) {
			console.log(`[IndexNow] 发现 ${duplicates} 个重复URL，已去重`);
		}

		// 过滤已缓存的URL
		const { new: newUrls, cached } = this.filterCachedUrls(uniqueUrls);
		if (cached > 0) {
			console.log(`[IndexNow] ${cached} 个URL已在缓存中，跳过推送`);
		}

		if (newUrls.length === 0) {
			console.log("[IndexNow] 没有新的URL需要推送");
			return {
				success: true,
				submitted: urls,
				results: [],
				totalProcessed: urls.length,
				failures: 0,
				cached,
			};
		}

		// 分批处理
		const chunks = this.chunkUrls(newUrls, this.config.rateLimiting.batchSize);
		console.log(
			`[IndexNow] 分 ${chunks.length} 批推送 ${newUrls.length} 个新URL`,
		);

		const allResults: Array<{
			endpoint?: string;
			status?: number;
			statusText?: string;
			error?: unknown;
			retries?: number;
		}> = [];
		let totalFailures = 0;

		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			console.log(
				`[IndexNow] 处理第 ${i + 1}/${chunks.length} 批 (${chunk.length} 个URL)`,
			);

			const payload = {
				host: new URL(this.config.siteUrl).hostname,
				key: this.config.apiKey,
				keyLocation: this.config.keyLocation,
				urlList: chunk,
			};

			// 检查频率限制
			await this.rateLimiter.checkLimit();

			// 向多个搜索引擎提交
			const results = await Promise.allSettled(
				this.config.endpoints.map((endpoint) =>
					this.fetchWithRetry(endpoint, payload),
				),
			);

			const processedResults = results.map((result) =>
				result.status === "fulfilled" ? result.value : { error: result.reason },
			);

			const batchFailures = processedResults.filter((r) => "error" in r).length;
			totalFailures += batchFailures;

			// 如果至少有一个端点成功，则缓存这批URL
			if (batchFailures < this.config.endpoints.length) {
				this.cache.addBatch(chunk);
			}

			allResults.push(...processedResults);

			// 批次间延迟
			if (i < chunks.length - 1) {
				await this.delay(1000); // 1秒延迟
			}
		}

		const success = totalFailures < allResults.length;

		return {
			success,
			submitted: urls,
			results: allResults,
			totalProcessed: urls.length,
			failures: totalFailures,
			cached,
		};
	}

	/**
	 * 推送文章到搜索引擎
	 */
	async submitPost(entry: CollectionEntry<"posts">): Promise<IndexNowResponse> {
		const url = new URL(`posts/${entry.slug}/`, this.config.siteUrl).href;
		return await this.submitUrl(url);
	}

	/**
	 * 批量推送文章到搜索引擎
	 */
	async submitPosts(
		entries: CollectionEntry<"posts">[],
	): Promise<IndexNowResponse> {
		const urls = entries.map(
			(entry) => new URL(`posts/${entry.slug}/`, this.config.siteUrl).href,
		);
		return await this.submitUrls(urls);
	}

	/**
	 * 推送站点重要页面
	 */
	async submitSitePages(): Promise<IndexNowResponse> {
		const importantPages = [
			new URL("/", this.config.siteUrl).href,
			new URL("/about/", this.config.siteUrl).href,
			new URL("/friends/", this.config.siteUrl).href,
			new URL("/archive/", this.config.siteUrl).href,
			new URL("/gallery/", this.config.siteUrl).href,
		];

		return await this.submitUrls(importantPages);
	}

	/**
	 * 获取缓存统计信息
	 */
	getCacheStats(): { size: number; enabled: boolean } {
		return {
			size: this.cache.size(),
			enabled: this.config.caching.enabled,
		};
	}

	/**
	 * 清理缓存
	 */
	clearCache(): void {
		this.cache.clear();
		console.log("[IndexNow] 缓存已清理");
	}
}

// 默认客户端实例
let defaultClient: OptimizedIndexNowClient | null = null;

/**
 * 获取默认的IndexNow客户端实例
 */
export function getIndexNowClient(): OptimizedIndexNowClient {
	if (!defaultClient) {
		defaultClient = new OptimizedIndexNowClient();
	}
	return defaultClient;
}

// 向后兼容的函数
export async function submitUrlToIndexNow(
	url: string,
): Promise<IndexNowResponse> {
	return await getIndexNowClient().submitUrl(url);
}

export async function submitUrlsToIndexNow(
	urls: string[],
): Promise<IndexNowResponse> {
	return await getIndexNowClient().submitUrls(urls);
}

export async function submitPostToIndexNow(
	entry: CollectionEntry<"posts">,
): Promise<IndexNowResponse> {
	return await getIndexNowClient().submitPost(entry);
}

export async function submitPostsToIndexNow(
	entries: CollectionEntry<"posts">[],
): Promise<IndexNowResponse> {
	return await getIndexNowClient().submitPosts(entries);
}

export async function submitSitePagesToIndexNow(): Promise<IndexNowResponse> {
	return await getIndexNowClient().submitSitePages();
}

// 开发模式检查
export function isDevMode(): boolean {
	if (typeof import.meta !== "undefined" && import.meta.env) {
		return import.meta.env.DEV === true;
	}
	if (typeof process !== "undefined" && process?.env) {
		return process.env.NODE_ENV === "development";
	}
	return false;
}

/**
 * 智能推送函数 - 根据环境决定是否实际推送
 */
export async function smartSubmitUrl(url: string): Promise<IndexNowResponse> {
	if (isDevMode()) {
		console.log(`[IndexNow Dev] 模拟推送URL: ${url}`);
		return {
			success: true,
			submitted: url,
			results: getIndexNowConfig().endpoints.map((endpoint) => ({
				endpoint,
				status: 200,
				statusText: "OK (Simulated)",
				retries: 0,
			})),
			totalProcessed: 1,
			failures: 0,
			cached: 0,
		};
	}
	return await submitUrlToIndexNow(url);
}
