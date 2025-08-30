#!/usr/bin/env node

/**
 * 构建后自动推送脚本
 * 在生产构建完成后运行此脚本来推送所有内容到IndexNow
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IndexNow 配置
const SITE_URL = "https://freebird2913.tech";
const INDEXNOW_KEY = "f494d9ef355649f38fb34bf5740376c8";
const INDEXNOW_ENDPOINTS = [
	"https://api.indexnow.org/indexnow",
	"https://www.bing.com/indexnow",
	"https://yandex.com/indexnow",
];

/**
 * 推送URL到IndexNow
 */
async function submitUrls(urls) {
	if (urls.length === 0) {
		console.log("[IndexNow] 没有URL需要推送");
		return;
	}

	const payload = {
		host: new URL(SITE_URL).hostname,
		key: INDEXNOW_KEY,
		keyLocation: `${SITE_URL}/f494d9ef355649f38fb34bf5740376c8.txt`,
		urlList: urls,
	};

	console.log(`[IndexNow] 推送 ${urls.length} 个URL...`);

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

				console.log(
					`[IndexNow] ${endpoint}: ${response.status} ${response.statusText}`,
				);

				return {
					endpoint,
					status: response.status,
					statusText: response.statusText,
				};
			} catch (error) {
				console.error(`[IndexNow] 推送到 ${endpoint} 失败:`, error.message);
				return { endpoint, error: error.message };
			}
		}),
	);

	const successful = results.filter((r) => r.status === "fulfilled").length;
	const failed = results.length - successful;

	console.log(`[IndexNow] 推送完成: ${successful} 成功, ${failed} 失败`);
}

/**
 * 获取站点重要页面
 */
function getSitePages() {
	return [
		`${SITE_URL}/`, // 首页
		`${SITE_URL}/about/`, // 关于页面
		`${SITE_URL}/friends/`, // 友链页面
		`${SITE_URL}/archive/`, // 归档页面
	];
}

/**
 * 从构建输出中扫描文章页面
 */
function scanPostPages(distDir) {
	const postsDir = path.join(distDir, "posts");
	const urls = [];

	if (!fs.existsSync(postsDir)) {
		console.log("[IndexNow] 未找到posts目录");
		return urls;
	}

	try {
		const entries = fs.readdirSync(postsDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				urls.push(`${SITE_URL}/posts/${entry.name}/`);
			}
		}

		console.log(`[IndexNow] 发现 ${urls.length} 篇文章`);
		return urls;
	} catch (error) {
		console.error("[IndexNow] 扫描文章失败:", error.message);
		return urls;
	}
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

	if (!isProduction && !forceSubmit) {
		console.log("[IndexNow] 非生产环境，跳过推送（使用 --force 参数强制推送）");
		return;
	}

	if (forceSubmit) {
		console.log("[IndexNow] 强制推送模式");
	}

	try {
		const distDir = path.join(process.cwd(), "dist");

		if (!fs.existsSync(distDir)) {
			console.log("[IndexNow] 构建输出目录不存在，跳过推送");
			return;
		}

		// 获取所有需要推送的URL
		const sitePages = getSitePages();
		const postPages = scanPostPages(distDir);
		const allUrls = [...sitePages, ...postPages];

		if (allUrls.length > 0) {
			await submitUrls(allUrls);
		} else {
			console.log("[IndexNow] 没有找到需要推送的页面");
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

export { main, submitUrls, getSitePages, scanPostPages };
