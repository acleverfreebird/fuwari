#!/usr/bin/env node

/**
 * SEO检查工具
 * 检查网站的SEO优化状况
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔍 开始SEO优化检查...\n");

// 检查必要文件是否存在
const requiredFiles = [
	{ path: "dist/sitemap.xml", name: "站点地图" },
	{ path: "dist/robots.txt", name: "Robots.txt" },
	{ path: "dist/rss.xml", name: "RSS订阅" },
	{ path: "dist/manifest.json", name: "PWA清单" },
	{
		path: "public/f494d9ef355649f38fb34bf5740376c8.txt",
		name: "IndexNow密钥文件",
	},
];

console.log("📁 检查SEO相关文件:");
requiredFiles.forEach(({ path: filePath, name }) => {
	const fullPath = path.join(process.cwd(), filePath);
	if (fs.existsSync(fullPath)) {
		console.log(`✅ ${name}: ${filePath}`);
	} else {
		console.log(`❌ ${name}: ${filePath} - 文件不存在`);
	}
});

// 检查SEO元数据
console.log("\n🏷️  检查SEO元数据:");

// 检查关键页面
const distDir = path.join(process.cwd(), "dist");
if (fs.existsSync(distDir)) {
	const indexPath = path.join(distDir, "index.html");
	if (fs.existsSync(indexPath)) {
		const content = fs.readFileSync(indexPath, "utf-8");

		// 检查关键SEO元素
		const checks = [
			{ regex: /<title>([^<]+)<\/title>/, name: "页面标题" },
			{ regex: /<meta name="description" content="([^"]*)"/, name: "页面描述" },
			{ regex: /<meta name="keywords" content="([^"]*)"/, name: "关键词" },
			{ regex: /<meta property="og:title"/, name: "Open Graph标题" },
			{ regex: /<meta property="og:description"/, name: "Open Graph描述" },
			{ regex: /<meta property="og:image"/, name: "Open Graph图片" },
			{ regex: /<meta name="twitter:card"/, name: "Twitter Card" },
			{ regex: /<link rel="canonical"/, name: "规范链接" },
			{ regex: /<script [^>]*application\/ld\+json/, name: "结构化数据" },
			{ regex: /<link rel="manifest"/, name: "PWA清单链接" },
		];

		checks.forEach(({ regex, name }) => {
			if (regex.test(content)) {
				const match = content.match(regex);
				const preview =
					match && match[1] ? ` (${match[1].substring(0, 50)}...)` : "";
				console.log(`✅ ${name}${preview}`);
			} else {
				console.log(`❌ ${name} - 未找到`);
			}
		});

		// 检查性能优化
		console.log("\n⚡ 检查性能优化:");
		const performanceChecks = [
			{ regex: /<link rel="preload"/, name: "关键资源预加载" },
			{ regex: /<link rel="preconnect"/, name: "DNS预连接" },
			{ regex: /<link rel="dns-prefetch"/, name: "DNS预解析" },
			{ regex: /<link rel="prefetch"/, name: "页面预取" },
			{ regex: /font-display:\s*swap/, name: "字体优化" },
			{ regex: /loading="lazy"/, name: "图片懒加载" },
		];

		performanceChecks.forEach(({ regex, name }) => {
			if (regex.test(content)) {
				console.log(`✅ ${name}`);
			} else {
				console.log(`⚠️  ${name} - 可以进一步优化`);
			}
		});
	}
}

// 检查构建脚本配置
console.log("\n🔧 检查构建配置:");
const packageJsonPath = path.join(process.cwd(), "package.json");
if (fs.existsSync(packageJsonPath)) {
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

	if (packageJson.scripts) {
		console.log(
			`✅ 构建脚本: ${packageJson.scripts.build ? "已配置" : "未配置"}`,
		);
		console.log(
			`✅ IndexNow脚本: ${packageJson.scripts["indexnow:submit"] ? "已配置" : "未配置"}`,
		);
	}
}

// 检查Astro配置
console.log("\n🚀 检查Astro配置:");
const astroConfigPath = path.join(process.cwd(), "astro.config.mjs");
if (fs.existsSync(astroConfigPath)) {
	const astroConfig = fs.readFileSync(astroConfigPath, "utf-8");

	const astroChecks = [
		{ regex: /site:\s*["']([^"']+)["']/, name: "站点URL配置" },
		{ regex: /sitemap\(\)/, name: "Sitemap集成" },
		{ regex: /trailingSlash:\s*["']always["']/, name: "URL末尾斜杠" },
	];

	astroChecks.forEach(({ regex, name }) => {
		if (regex.test(astroConfig)) {
			console.log(`✅ ${name}`);
		} else {
			console.log(`⚠️  ${name} - 建议配置`);
		}
	});
}

console.log("\n📊 SEO优化建议:");
console.log("1. 确保所有页面都有独特的标题和描述");
console.log("2. 为所有图片添加alt属性");
console.log("3. 使用结构化数据标记内容");
console.log("4. 优化页面加载速度");
console.log("5. 确保移动端友好");
console.log("6. 定期更新sitemap");
console.log("7. 监控Core Web Vitals指标");

console.log("\n✨ SEO检查完成!");
