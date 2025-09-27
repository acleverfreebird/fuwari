#!/usr/bin/env node

/**
 * 诊断 views API 问题的脚本
 */

const SITE_URL = "https://www.freebird2913.tech";

async function testAPI(url, description) {
	console.log(`\n🔍 测试: ${description}`);
	console.log(`📍 URL: ${url}`);

	try {
		const response = await fetch(url);
		console.log(`📊 状态: ${response.status} ${response.statusText}`);

		if (response.ok) {
			const data = await response.text();
			console.log(`📄 响应: ${data}`);

			try {
				const json = JSON.parse(data);
				console.log(`✅ JSON解析成功:`, json);
			} catch (e) {
				console.log(`❌ JSON解析失败: ${e.message}`);
			}
		} else {
			const errorText = await response.text();
			console.log(`❌ 错误响应: ${errorText}`);
		}
	} catch (error) {
		console.log(`💥 请求失败: ${error.message}`);
	}
}

async function main() {
	console.log("🚀 开始诊断 Views API 问题...\n");

	// 测试总数API
	await testAPI(`${SITE_URL}/api/views/total/`, "总阅读量和访问量API");

	// 测试单篇文章API（不同的slug格式）
	const testSlugs = [
		"how-to-use-flask",
		"how-to-use-claude-code",
		"astro-blog-netlify-deployment-guide"
	];

	for (const slug of testSlugs) {
		await testAPI(`${SITE_URL}/api/views/${slug}?type=views`, `文章 ${slug} 的访问量`);
		await testAPI(`${SITE_URL}/api/views/${slug}?type=reads`, `文章 ${slug} 的阅读量`);
	}

	console.log("\n🏁 诊断完成！");
	console.log("\n💡 如果看到500错误，可能的原因：");
	console.log("   1. Redis 配置问题（UPSTASH_REDIS_REST_URL 或 UPSTASH_REDIS_REST_TOKEN 未设置）");
	console.log("   2. API 路由冲突（已解决）");
	console.log("   3. Vercel 函数部署问题");
	console.log("   4. 代码运行时错误");
}

main().catch(console.error);