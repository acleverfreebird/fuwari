#!/usr/bin/env node

/**
 * 提取关键 CSS 脚本
 *
 * 分析构建后的 HTML,提取首屏渲染所需的关键 CSS
 * 用于优化 FCP (First Contentful Paint)
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, extname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// 关键CSS选择器 - 首屏必需的样式
const CRITICAL_SELECTORS = [
	// 基础样式
	"html",
	"body",
	"*",

	// 导航栏
	"#navbar-wrapper",
	".navbar",
	"nav",

	// Banner
	"#banner-wrapper",
	"#banner",
	".banner",

	// 主要布局
	"#main-grid",
	".card-base",
	".container",

	// 字体
	"@font-face",

	// 主题变量
	":root",
	"[data-theme]",

	// 响应式断点
	"@media",

	// Tailwind 基础工具类
	".transition",
	".flex",
	".grid",
	".hidden",
	".block",
	".relative",
	".absolute",
	".fixed",
	".sticky",
	".w-full",
	".h-full",
	".mx-auto",
	".px-",
	".py-",
	".text-",
	".bg-",
	".rounded-",
	".overflow-",

	// 深色模式
	".dark",
	'[class*="dark:"]',
];

/**
 * 递归查找所有 HTML 文件
 */
function findHtmlFiles(dir, fileList = []) {
	const files = readdirSync(dir);

	for (const file of files) {
		const filePath = join(dir, file);
		const stat = statSync(filePath);

		if (stat.isDirectory()) {
			// 跳过 node_modules 和其他不必要的目录
			if (!["node_modules", ".git", ".astro"].includes(file)) {
				findHtmlFiles(filePath, fileList);
			}
		} else if (extname(file) === ".html") {
			fileList.push(filePath);
		}
	}

	return fileList;
}

/**
 * 从 HTML 中提取使用的类名
 */
function extractClassesFromHtml(htmlContent) {
	const classRegex = /class="([^"]*)"/g;
	const classes = new Set();

	let match = classRegex.exec(htmlContent);
	while (match !== null) {
		const classList = match[1].split(/\s+/);
		classList.forEach((cls) => classes.add(cls));
		match = classRegex.exec(htmlContent);
	}

	return classes;
}

/**
 * 检查 CSS 规则是否匹配关键选择器
 */
function isCriticalRule(rule, usedClasses) {
	const ruleText = rule.toLowerCase();

	// 检查是否匹配关键选择器
	for (const selector of CRITICAL_SELECTORS) {
		if (ruleText.includes(selector.toLowerCase())) {
			return true;
		}
	}

	// 检查是否匹配 HTML 中使用的类
	for (const className of usedClasses) {
		if (ruleText.includes(`.${className}`)) {
			return true;
		}
	}

	return false;
}

/**
 * 提取关键 CSS
 */
function extractCriticalCss(cssContent, usedClasses) {
	const rules = [];
	let currentRule = "";
	let braceCount = 0;
	let inRule = false;

	for (let i = 0; i < cssContent.length; i++) {
		const char = cssContent[i];

		if (char === "{") {
			braceCount++;
			inRule = true;
		} else if (char === "}") {
			braceCount--;
			if (braceCount === 0) {
				currentRule += char;

				// 检查是否是关键规则
				if (isCriticalRule(currentRule, usedClasses)) {
					rules.push(currentRule.trim());
				}

				currentRule = "";
				inRule = false;
				continue;
			}
		}

		if (inRule || braceCount > 0 || char.trim()) {
			currentRule += char;
		}
	}

	return rules.join("\n");
}

/**
 * 主函数
 */
async function main() {
	console.log("🎨 开始提取关键 CSS...\n");

	const distDir = join(projectRoot, "dist");

	try {
		// 1. 查找所有 HTML 文件
		console.log("📄 扫描 HTML 文件...");
		const htmlFiles = findHtmlFiles(distDir);
		console.log(`   找到 ${htmlFiles.length} 个 HTML 文件\n`);

		// 2. 提取首页使用的类名
		const indexPath = join(distDir, "index.html");
		const indexHtml = readFileSync(indexPath, "utf-8");
		const usedClasses = extractClassesFromHtml(indexHtml);
		console.log(`📋 提取了 ${usedClasses.size} 个类名\n`);

		// 3. 查找 CSS 文件
		const cssFiles = readdirSync(join(distDir, "_astro"))
			.filter((file) => file.endsWith(".css"))
			.map((file) => join(distDir, "_astro", file));

		console.log(`🎨 找到 ${cssFiles.length} 个 CSS 文件:`);
		cssFiles.forEach((file) => {
			const size = (statSync(file).size / 1024).toFixed(2);
			console.log(`   - ${file.split("/").pop()}: ${size} KB`);
		});
		console.log();

		// 4. 提取关键 CSS
		let criticalCss = "";
		let totalOriginalSize = 0;

		for (const cssFile of cssFiles) {
			const cssContent = readFileSync(cssFile, "utf-8");
			totalOriginalSize += cssContent.length;

			const critical = extractCriticalCss(cssContent, usedClasses);
			criticalCss += critical + "\n";
		}

		// 5. 保存关键 CSS
		const outputPath = join(projectRoot, "src/styles/critical.css");
		writeFileSync(outputPath, criticalCss);

		const criticalSize = (criticalCss.length / 1024).toFixed(2);
		const originalSize = (totalOriginalSize / 1024).toFixed(2);
		const reduction = (
			((totalOriginalSize - criticalCss.length) / totalOriginalSize) *
			100
		).toFixed(1);

		console.log("✅ 关键 CSS 提取完成!");
		console.log(`   原始大小: ${originalSize} KB`);
		console.log(`   关键CSS: ${criticalSize} KB`);
		console.log(`   减少: ${reduction}%`);
		console.log(`   输出: ${outputPath}\n`);

		console.log("📝 后续步骤:");
		console.log("   1. 在 Layout.astro 的 <head> 中内联 critical.css");
		console.log('   2. 使用 <link rel="preload"> 异步加载完整 CSS');
		console.log("   3. 测试页面样式是否正常");
	} catch (error) {
		console.error("\n❌ 提取失败:", error);
		process.exit(1);
	}
}

main();
