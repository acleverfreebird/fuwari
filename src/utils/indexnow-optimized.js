// 优化的 IndexNow 推送工具
import {
	getIndexNowConfig,
	validateConfig,
} from "../config/indexnow-config.js";

// URL缓存管理
class URLCache {
	constructor(config) {
		this.cache = new Map();
		this.config = config;
	}

	has(url) {
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

	add(url) {
		if (this.config.caching.enabled) {
			this.cache.set(url, Date.now());
		}
	}

	addBatch(urls) {
		if (this.config.caching.enabled) {
			const timestamp = Date.now();
			urls.forEach((url) => {
				this.cache.set(url, timestamp);
			});
		}
	}

	clear() {
		this.cache.clear();
	}

	size() {
		return this.cache.size;
	}
}

// 请求频率限制
class RateLimiter {
	constructor(config) {
		this.requests = [];
		this.config = config;
	}

	async checkLimit() {
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
	constructor(config = {}) {
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
	async delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * 计算重试延迟时间（指数退避）
	 */
	calculateRetryDelay(attempt) {
		const delay =
			this.config.retryConfig.initialDelay *
			this.config.retryConfig.backoffFactor ** attempt;
		return Math.min(delay, this.config.retryConfig.maxDelay);
	}

	/**
	 * 判断错误是否可重试
	 */
	isRetryableError(error) {
		// 网络错误通常可重试
		if (
			error.code === "ENOTFOUND" ||
			error.code === "ECONNRESET" ||
			error.code === "ETIMEDOUT"
		) {
			return true;
		}

		// HTTP状态码判断
		if (error.status) {
			// 5xx 服务器错误可重试
			if (error.status >= 500 && error.status < 600) return true;
			// 429 请求过于频繁可重试
			if (error.status === 429) return true;
			// 408 请求超时可重试
			if (error.status === 408) return true;
		}

		return false;
	}

	/**
	 * 带重试的HTTP请求
	 */
	async fetchWithRetry(
		endpoint,
		payload,
		maxRetries = this.config.retryConfig.maxRetries,
	) {
		let lastError;

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
					// 对于IndexNow，某些"错误"状态码实际上是可接受的
					if (isAcceptableIndexNowResponse(response.status)) {
						console.log(
							`[IndexNow] ${endpoint}: ${response.status} ${response.statusText} (可接受的响应)`,
						);
						return {
							endpoint,
							status: response.status,
							statusText: response.statusText,
							retries: attempt,
						};
					}

					const error = new Error(
						`HTTP ${response.status}: ${response.statusText}`,
					);
					error.status = response.status;
					error.statusText = response.statusText;
					error.endpoint = endpoint;

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
			} catch (error) {
				lastError = error;

				if (!this.isRetryableError(error) || attempt === maxRetries) {
					console.error(`[IndexNow] ${endpoint} 最终失败:`, error.message);
					throw error;
				}

				console.warn(
					`[IndexNow] ${endpoint} 请求失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`,
					error.message,
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
	deduplicateUrls(urls) {
		const seen = new Set();
		const unique = [];

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
	filterCachedUrls(urls) {
		const newUrls = [];
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
	chunkUrls(urls, chunkSize) {
		const chunks = [];
		for (let i = 0; i < urls.length; i += chunkSize) {
			chunks.push(urls.slice(i, i + chunkSize));
		}
		return chunks;
	}

	/**
	 * 推送单个URL
	 */
	async submitUrl(url) {
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

		const failures = processedResults.filter((r) => r.error).length;
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
	async submitUrls(urls) {
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

		const allResults = [];
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

			const batchFailures = processedResults.filter((r) => r.error).length;
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
	async submitPost(entry) {
		const url = new URL(`posts/${entry.slug}/`, this.config.siteUrl).href;
		return await this.submitUrl(url);
	}

	/**
	 * 批量推送文章到搜索引擎
	 */
	async submitPosts(entries) {
		const urls = entries.map(
			(entry) => new URL(`posts/${entry.slug}/`, this.config.siteUrl).href,
		);
		return await this.submitUrls(urls);
	}

	/**
	 * 推送站点重要页面
	 */
	async submitSitePages() {
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
	getCacheStats() {
		return {
			size: this.cache.size(),
			enabled: this.config.caching.enabled,
		};
	}

	/**
	 * 清理缓存
	 */
	clearCache() {
		this.cache.clear();
		console.log("[IndexNow] 缓存已清理");
	}
}

// 默认客户端实例
let defaultClient = null;

/**
 * 获取默认的IndexNow客户端实例
 */
export function getIndexNowClient() {
	if (!defaultClient) {
		defaultClient = new OptimizedIndexNowClient();
	}
	return defaultClient;
}

// 向后兼容的函数
export async function submitUrlToIndexNow(url) {
	return await getIndexNowClient().submitUrl(url);
}

export async function submitUrlsToIndexNow(urls) {
	return await getIndexNowClient().submitUrls(urls);
}

export async function submitPostToIndexNow(entry) {
	return await getIndexNowClient().submitPost(entry);
}

export async function submitPostsToIndexNow(entries) {
	return await getIndexNowClient().submitPosts(entries);
}

export async function submitSitePagesToIndexNow() {
	return await getIndexNowClient().submitSitePages();
}

// 开发模式检查
export function isDevMode() {
	if (typeof import.meta !== "undefined" && import.meta.env) {
		return import.meta.env.DEV === true;
	}
	if (process?.env) {
		return process.env.NODE_ENV === "development";
	}
	return false;
}

// 检查错误是否为预期的IndexNow响应
function isAcceptableIndexNowResponse(status) {
	// 200: 成功
	// 202: 已接受，正在处理
	// 400: 可能是重复提交或其他可接受的错误
	// 422: 可能是内容验证问题，但提交可能仍然有效
	return status === 200 || status === 202 || status === 400 || status === 422;
}

/**
 * 智能推送函数 - 根据环境决定是否实际推送
 */
export async function smartSubmitUrl(url) {
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
