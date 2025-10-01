#!/usr/bin/env node

/**
 * IndexNow CLI 工具
 * 提供命令行接口来管理IndexNow推送和缓存
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态导入优化的IndexNow客户端
async function getIndexNowClient() {
	const module = await import("../src/utils/indexnow-optimized.ts");
	return new module.OptimizedIndexNowClient();
}

// 显示帮助信息
function showHelp() {
	console.log(`
IndexNow CLI 工具 v1.0.0

用法:
  node indexnow-cli.js <命令> [选项]

命令:
  submit <url>                推送单个URL到搜索引擎
  submit-batch <url1> <url2>  批量推送多个URL到搜索引擎
  submit-site                 推送站点重要页面
  submit-all                  推送所有页面（从构建目录发现）
  cache                       缓存管理
  config                      检查IndexNow配置
  test                        测试IndexNow端点连接
  help                        显示帮助信息

选项:
  --force, -f                 强制推送，忽略缓存
  --stats, -s                 (cache命令) 显示缓存统计
  --clear, -c                 (cache命令) 清理缓存

示例:
  node indexnow-cli.js submit https://example.com/page
  node indexnow-cli.js submit-batch https://example.com/page1 https://example.com/page2
  node indexnow-cli.js submit-site --force
  node indexnow-cli.js cache --stats
  node indexnow-cli.js cache --clear
	`);
}

// 解析命令行参数
function parseArgs() {
	const args = process.argv.slice(2);
	const command = args[0];
	const options = {};
	const params = [];

	for (let i = 1; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--")) {
			const key = arg.slice(2);
			options[key] = true;
		} else if (arg.startsWith("-")) {
			const key = arg.slice(1);
			options[key] = true;
		} else {
			params.push(arg);
		}
	}

	return { command, options, params };
}

// 命令处理函数
async function handleSubmit(url, options) {
	try {
		const client = await getIndexNowClient();

		if (options.force || options.f) {
			client.clearCache();
			console.log("已清理缓存");
		}

		console.log(`推送URL: ${url}`);
		const result = await client.submitUrl(url);

		console.log("推送结果:", {
			成功: result.success,
			失败数: result.failures,
			缓存命中: result.cached > 0,
		});

		if (result.results.length > 0) {
			console.log("\n详细结果:");
			result.results.forEach((r) => {
				console.log(
					`  ${r.endpoint}: ${r.status || "Error"} ${r.statusText || r.error}`,
				);
			});
		}
	} catch (error) {
		console.error("推送失败:", error.message);
		process.exit(1);
	}
}

async function handleSubmitBatch(urls, options) {
	try {
		const client = await getIndexNowClient();

		if (options.force || options.f) {
			client.clearCache();
			console.log("已清理缓存");
		}

		console.log(`批量推送 ${urls.length} 个URL`);
		const result = await client.submitUrls(urls);

		console.log("推送结果:", {
			总数: result.totalProcessed,
			成功: result.totalProcessed - result.failures,
			失败: result.failures,
			缓存命中: result.cached,
		});

		if (result.failures > 0) {
			console.log("\n存在失败的推送，请检查日志");
		}
	} catch (error) {
		console.error("批量推送失败:", error.message);
		process.exit(1);
	}
}

async function handleSubmitSite(options) {
	try {
		const client = await getIndexNowClient();

		if (options.force || options.f) {
			client.clearCache();
			console.log("已清理缓存");
		}

		console.log("推送站点重要页面...");
		const result = await client.submitSitePages();

		console.log("推送结果:", {
			总数: result.totalProcessed,
			成功: result.totalProcessed - result.failures,
			失败: result.failures,
			缓存命中: result.cached,
		});
	} catch (error) {
		console.error("推送站点页面失败:", error.message);
		process.exit(1);
	}
}

async function handleSubmitAll(options) {
	try {
		// 动态导入post-build模块的函数
		const postBuildModule = await import("./post-build.js");
		const client = await getIndexNowClient();

		if (options.force || options.f) {
			client.clearCache();
			console.log("已清理缓存");
		}

		console.log("发现所有页面...");

		const distDir = path.join(process.cwd(), "dist");
		if (!fs.existsSync(distDir)) {
			console.error("构建目录不存在，请先运行 npm run build");
			process.exit(1);
		}

		// 使用post-build的页面发现逻辑
		const sitemapUrls = postBuildModule.parseSitemapUrls(
			path.join(distDir, "client"),
		);
		const scannedUrls = postBuildModule.scanAllPages(distDir);
		const importantUrls = postBuildModule.getImportantPages();

		const allUrls = postBuildModule.mergeAndDeduplicateUrls(
			sitemapUrls,
			scannedUrls,
			importantUrls,
		);

		const sortedUrls = postBuildModule.sortUrlsByPriority(allUrls);

		console.log(`发现 ${sortedUrls.length} 个页面:`);
		console.log(`  - sitemap.xml: ${sitemapUrls.length} 个`);
		console.log(`  - 目录扫描: ${scannedUrls.length} 个`);
		console.log(`  - 重要页面: ${importantUrls.length} 个`);

		if (sortedUrls.length === 0) {
			console.log("没有找到需要推送的页面");
			return;
		}

		console.log("开始推送所有页面...");
		const result = await client.submitUrls(sortedUrls);

		console.log("推送结果:", {
			总数: result.totalProcessed,
			成功: result.totalProcessed - result.failures,
			失败: result.failures,
			缓存命中: result.cached,
		});

		if (result.failures > 0) {
			console.log("注意: 存在推送失败，请检查上方的详细错误信息");
		}
	} catch (error) {
		console.error("推送所有页面失败:", error.message);
		process.exit(1);
	}
}

async function handleCache(options) {
	try {
		const client = await getIndexNowClient();

		if (options.clear || options.c) {
			client.clearCache();
			console.log("缓存已清理");
			return;
		}

		if (options.stats || options.s) {
			const stats = client.getCacheStats();
			console.log("缓存统计:");
			console.log(`  状态: ${stats.enabled ? "启用" : "禁用"}`);
			console.log(`  大小: ${stats.size} 个URL`);
			return;
		}

		console.log("使用 --stats 查看缓存统计，--clear 清理缓存");
	} catch (error) {
		console.error("缓存操作失败:", error.message);
		process.exit(1);
	}
}

async function handleConfig() {
	try {
		const module = await import("../src/config/indexnow-config.ts");
		const config = module.getIndexNowConfig();
		const isValid = module.validateConfig(config);

		console.log("IndexNow 配置:");
		console.log(`  站点URL: ${config.siteUrl}`);
		console.log(`  API密钥: ${config.apiKey.substring(0, 8)}...`);
		console.log(`  端点数量: ${config.endpoints.length}`);
		console.log(`  最大重试: ${config.retryConfig.maxRetries}`);
		console.log(`  批次大小: ${config.rateLimiting.batchSize}`);
		console.log(`  缓存状态: ${config.caching.enabled ? "启用" : "禁用"}`);
		console.log(`  配置有效: ${isValid ? "是" : "否"}`);

		if (!isValid) {
			process.exit(1);
		}
	} catch (error) {
		console.error("检查配置失败:", error.message);
		process.exit(1);
	}
}

async function handleTest() {
	try {
		const module = await import("../src/config/indexnow-config.ts");
		const config = module.getIndexNowConfig();

		console.log("测试IndexNow端点连接...");

		for (const endpoint of config.endpoints) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10000);

				const response = await fetch(endpoint, {
					method: "HEAD",
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				console.log(
					`  ${endpoint}: ${response.status === 200 ? "✓" : "✗"} (${response.status})`,
				);
			} catch (error) {
				console.log(`  ${endpoint}: ✗ (${error.message})`);
			}
		}
	} catch (error) {
		console.error("测试连接失败:", error.message);
		process.exit(1);
	}
}

// 主函数
async function main() {
	const { command, options, params } = parseArgs();

	if (!command || command === "help") {
		showHelp();
		return;
	}

	switch (command) {
		case "submit":
			if (params.length === 0) {
				console.error("错误: 需要提供URL参数");
				process.exit(1);
			}
			await handleSubmit(params[0], options);
			break;

		case "submit-batch":
			if (params.length === 0) {
				console.error("错误: 需要提供至少一个URL参数");
				process.exit(1);
			}
			await handleSubmitBatch(params, options);
			break;

		case "submit-site":
			await handleSubmitSite(options);
			break;

		case "submit-all":
			await handleSubmitAll(options);
			break;

		case "cache":
			await handleCache(options);
			break;

		case "config":
			await handleConfig();
			break;

		case "test":
			await handleTest();
			break;

		default:
			console.error(`错误: 未知命令 '${command}'`);
			showHelp();
			process.exit(1);
	}
}

// 运行CLI
main().catch((error) => {
	console.error("CLI运行失败:", error.message);
	process.exit(1);
});
