#!/usr/bin/env node

/**
 * 构建后自动推送脚本
 * 在生产构建完成后运行此脚本来推送所有内容到IndexNow
 *
 * 功能:
 * 1. 解析sitemap.xml获取所有URL
 * 2. 扫描构建目录发现所有HTML页面
 * 3. 智能合并和去重URL列表
 * 4. 批量推送到IndexNow
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 站点配置
const SITE_URL = "https://www.freebird2913.tech";

// 动态导入优化的IndexNow客户端
let IndexNowClient;

async function loadIndexNowClient() {
	if (!IndexNowClient) {
		const module = await import("../src/utils/indexnow-optimized.ts");
		IndexNowClient = module.OptimizedIndexNowClient;
	}
	return IndexNowClient;
}

/**
 * 解析sitemap.xml获取所有URL
 */
function parseSitemapUrls(distDir) {
	const sitemapPath = path.join(distDir, "sitemap.xml");
	const urls = [];

	if (!fs.existsSync(sitemapPath)) {
		console.log("[IndexNow] 未找到sitemap.xml，跳过sitemap解析");
		return urls;
	}

	try {
		const sitemapContent = fs.readFileSync(sitemapPath, "utf-8");

		// 简单的XML解析，提取<loc>标签中的URL
		const locMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);

		if (locMatches) {
			for (const match of locMatches) {
				const url = match.replace(/<\/?loc>/g, "").trim();
				if (url.startsWith(SITE_URL)) {
					urls.push(url);
				}
			}
		}

		console.log(`[IndexNow] 从sitemap.xml解析到 ${urls.length} 个URL`);
		return urls;
	} catch (error) {
		console.error("[IndexNow] 解析sitemap.xml失败:", error.message);
		return urls;
	}
}

/**
 * 递归扫描目录中的所有HTML文件
 */
function scanHtmlFiles(dir, baseDir, urls = []) {
	if (!fs.existsSync(dir)) {
		return urls;
	}

	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				// 跳过一些不需要的目录
				if (!["_astro", "favicon", "api"].includes(entry.name)) {
					scanHtmlFiles(fullPath, baseDir, urls);
				}
			} else if (entry.name === "index.html") {
				// 将文件路径转换为URL
				const relativePath = path.relative(baseDir, dir);
				let url = SITE_URL;

				if (relativePath && relativePath !== ".") {
					url += "/" + relativePath.replace(/\\/g, "/") + "/";
				} else {
					url += "/";
				}

				urls.push(url);
			}
		}

		return urls;
	} catch (error) {
		console.error(`[IndexNow] 扫描目录 ${dir} 失败:`, error.message);
		return urls;
	}
}

/**
 * 从构建输出中扫描所有页面
 */
function scanAllPages(distDir) {
	const clientDir = path.join(distDir, "client");

	if (!fs.existsSync(clientDir)) {
		console.log("[IndexNow] 未找到client目录，尝试直接扫描dist目录");
		return scanHtmlFiles(distDir, distDir);
	}

	console.log("[IndexNow] 扫描构建目录中的所有HTML页面...");
	const urls = scanHtmlFiles(clientDir, clientDir);
	console.log(`[IndexNow] 从构建目录发现 ${urls.length} 个页面`);

	return urls;
}

/**
 * 获取站点重要页面（备用方案）
 */
function getImportantPages() {
	return [
		`${SITE_URL}/`, // 首页
		`${SITE_URL}/about/`, // 关于页面
		`${SITE_URL}/friends/`, // 友链页面
		`${SITE_URL}/archive/`, // 归档页面
		`${SITE_URL}/gallery/`, // 相册页面
		`${SITE_URL}/music/`, // 音乐页面
		`${SITE_URL}/music-admin/`, // 音乐管理页面
	];
}

/**
 * 合并和去重URL列表
 */
function mergeAndDeduplicateUrls(...urlArrays) {
	const allUrls = [];
	const seen = new Set();

	for (const urls of urlArrays) {
		for (const url of urls) {
			// 标准化URL格式
			let normalizedUrl = url.trim();
			if (
				!normalizedUrl.endsWith("/") &&
				!normalizedUrl.includes("?") &&
				!normalizedUrl.includes("#")
			) {
				normalizedUrl += "/";
			}

			if (!seen.has(normalizedUrl)) {
				seen.add(normalizedUrl);
				allUrls.push(normalizedUrl);
			}
		}
	}

	return allUrls;
}

/**
 * 按优先级排序URL
 */
function sortUrlsByPriority(urls) {
	const priorities = {
		[`${SITE_URL}/`]: 1, // 首页最高优先级
		[`${SITE_URL}/about/`]: 2,
		[`${SITE_URL}/archive/`]: 3,
		[`${SITE_URL}/friends/`]: 4,
	};

	return urls.sort((a, b) => {
		const priorityA = priorities[a] || 999;
		const priorityB = priorities[b] || 999;

		if (priorityA !== priorityB) {
			return priorityA - priorityB;
		}

		// 文章页面按字母顺序排序
		return a.localeCompare(b);
	});
}

/**
 * 主函数
 */
async function main() {
	console.log("[IndexNow] 开始构建后推送...");
	console.log("[IndexNow] NODE_ENV:", process.env.NODE_ENV);

	// 检查环境 - 更宽松的条件，支持强制推送
	const isProduction = process.env.NODE_ENV === "production";
	const forceSubmit = process.argv.includes("--force");
	const dryRun = process.argv.includes("--dry-run");

	if (!isProduction && !forceSubmit && !dryRun) {
		console.log(
			"[IndexNow] 非生产环境，跳过推送（使用 --force 参数强制推送，--dry-run 查看将推送的URL）",
		);
		return;
	}

	if (forceSubmit) {
		console.log("[IndexNow] 强制推送模式");
	}

	if (dryRun) {
		console.log("[IndexNow] 干运行模式 - 仅显示将推送的URL，不实际推送");
	}

	try {
		const distDir = path.join(process.cwd(), "dist");

		if (!fs.existsSync(distDir)) {
			console.log("[IndexNow] 构建输出目录不存在，跳过推送");
			return;
		}

		console.log(`[IndexNow] 构建目录: ${distDir}`);

		// 多种方式发现URL
		const discoveryMethods = [
			{
				name: "sitemap.xml",
				fn: () => parseSitemapUrls(path.join(distDir, "client")),
			},
			{ name: "构建目录扫描", fn: () => scanAllPages(distDir) },
			{ name: "重要页面备用", fn: () => getImportantPages() },
		];

		const allUrlArrays = [];
		for (const method of discoveryMethods) {
			try {
				console.log(`[IndexNow] 尝试 ${method.name}...`);
				const urls = method.fn();
				allUrlArrays.push(urls);
				console.log(`[IndexNow] ${method.name} 发现 ${urls.length} 个URL`);
			} catch (error) {
				console.warn(`[IndexNow] ${method.name} 失败:`, error.message);
				allUrlArrays.push([]);
			}
		}

		// 合并、去重和排序所有URL
		const allUrls = mergeAndDeduplicateUrls(...allUrlArrays);
		const sortedUrls = sortUrlsByPriority(allUrls);

		console.log(`[IndexNow] 合并去重后共 ${sortedUrls.length} 个唯一URL`);

		if (sortedUrls.length === 0) {
			console.log("[IndexNow] 没有找到需要推送的页面");
			return;
		}

		// 显示将要推送的URL列表（前10个）
		console.log("[IndexNow] 将推送以下URL:");
		sortedUrls.slice(0, 10).forEach((url, index) => {
			console.log(`  ${index + 1}. ${url}`);
		});

		if (sortedUrls.length > 10) {
			console.log(`  ... 还有 ${sortedUrls.length - 10} 个URL`);
		}

		// 如果是干运行，到此为止
		if (dryRun) {
			console.log("[IndexNow] 干运行完成，未实际推送");
			return;
		}

		// 使用优化的IndexNow客户端进行推送
		const ClientClass = await loadIndexNowClient();
		const client = new ClientClass();

		console.log(`[IndexNow] 开始推送 ${sortedUrls.length} 个URL...`);
		const startTime = Date.now();

		const result = await client.submitUrls(sortedUrls);

		const endTime = Date.now();
		const duration = ((endTime - startTime) / 1000).toFixed(2);

		console.log("[IndexNow] 推送完成!");
		console.log("[IndexNow] 推送结果:", {
			总数: result.totalProcessed,
			成功: result.totalProcessed - result.failures,
			失败: result.failures,
			缓存命中: result.cached,
			耗时: `${duration}秒`,
		});

		// 显示缓存统计
		const cacheStats = client.getCacheStats();
		console.log(`[IndexNow] 缓存统计: ${cacheStats.size} 个URL已缓存`);

		// 如果有失败，显示详细信息
		if (result.failures > 0) {
			console.log("[IndexNow] 注意: 存在推送失败，请检查上方的详细错误信息");
		}

		console.log("[IndexNow] 推送任务完成");
	} catch (error) {
		console.error("[IndexNow] 推送过程中出错:", error);
		process.exit(1);
	}
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export {
	main,
	parseSitemapUrls,
	scanAllPages,
	scanHtmlFiles,
	getImportantPages,
	mergeAndDeduplicateUrls,
	sortUrlsByPriority,
};
