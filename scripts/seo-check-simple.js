import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

function log(color, ...args) {
	console.log(color, ...args, colors.reset);
}

// 递归读取目录
function getAllFiles(dirPath, arrayOfFiles = []) {
	const files = fs.readdirSync(dirPath);

	files.forEach((file) => {
		const filePath = path.join(dirPath, file);
		if (fs.statSync(filePath).isDirectory()) {
			arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
		} else {
			arrayOfFiles.push(filePath);
		}
	});

	return arrayOfFiles;
}

// 解析Markdown frontmatter
function parseFrontmatter(content) {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return null;

	const frontmatter = {};
	const lines = match[1].split("\n");

	for (const line of lines) {
		const colonIndex = line.indexOf(":");
		if (colonIndex > 0) {
			const key = line.substring(0, colonIndex).trim();
			let value = line.substring(colonIndex + 1).trim();

			// 移除引号
			if (
				(value.startsWith("'") && value.endsWith("'")) ||
				(value.startsWith('"') && value.endsWith('"'))
			) {
				value = value.slice(1, -1);
			}

			frontmatter[key] = value;
		}
	}

	return frontmatter;
}

async function checkPosts() {
	log(colors.cyan, "\n📝 检查文章SEO...\n");

	const postsDir = path.join(__dirname, "../src/content/posts");
	const allFiles = getAllFiles(postsDir);
	const mdFiles = allFiles.filter((f) => f.endsWith(".md"));

	const issues = [];
	let totalIssues = 0;

	for (const file of mdFiles) {
		const content = fs.readFileSync(file, "utf-8");
		const frontmatter = parseFrontmatter(content);

		if (!frontmatter) continue;

		const { title, description } = frontmatter;
		const relativePath = path.relative(postsDir, file);
		const postIssues = [];

		// 检查标题
		if (!title) {
			postIssues.push("❌ 缺少标题");
			totalIssues++;
		} else if (title.length < 15) {
			postIssues.push(`⚠️  标题过短 (${title.length}字符，建议15-30字符)`);
			totalIssues++;
		}

		// 检查描述
		if (!description) {
			postIssues.push("❌ 缺少描述");
			totalIssues++;
		} else if (description.length < 120) {
			postIssues.push(
				`⚠️  描述过短 (${description.length}字符，建议120-160字符)`,
			);
			totalIssues++;
		}

		// 检查内容长度
		const bodyContent = content.replace(/^---[\s\S]*?---/, "").trim();
		const wordCount = bodyContent.length;
		if (wordCount < 800) {
			postIssues.push(`⚠️  内容过短 (${wordCount}字符，建议800字以上)`);
			totalIssues++;
		}

		if (postIssues.length > 0) {
			issues.push({
				file: relativePath,
				title: title || "无标题",
				issues: postIssues,
			});
		}
	}

	log(colors.blue, `📊 总文章数: ${mdFiles.length}`);
	log(colors.yellow, `⚠️  发现问题: ${totalIssues}个`);
	log(colors.cyan, `📄 问题文章: ${issues.length}篇\n`);

	if (issues.length > 0) {
		issues.forEach((issue) => {
			log(colors.red, `\n📄 ${issue.file}`);
			log(colors.cyan, `   标题: ${issue.title}`);
			issue.issues.forEach((i) => {
				console.log(`   ${i}`);
			});
		});
	} else {
		log(colors.green, "✅ 所有文章SEO检查通过！");
	}

	return {
		posts: mdFiles.length,
		issues: totalIssues,
		problemPosts: issues.length,
	};
}

async function checkH1Tags() {
	log(colors.cyan, "\n\n🏷️  检查H1标签...\n");

	const pagesDir = path.join(__dirname, "../src/pages");
	const allFiles = getAllFiles(pagesDir);
	const astroFiles = allFiles.filter((f) => f.endsWith(".astro"));

	const issues = [];
	let totalIssues = 0;

	for (const file of astroFiles) {
		const content = fs.readFileSync(file, "utf-8");
		const h1Matches = content.match(/<h1[^>]*>/g);
		const relativePath = path.relative(pagesDir, file);

		if (!h1Matches || h1Matches.length === 0) {
			issues.push({
				file: relativePath,
				type: "❌ 缺少H1标签",
				count: 0,
			});
			totalIssues++;
		} else if (h1Matches.length > 1) {
			issues.push({
				file: relativePath,
				type: "⚠️  多个H1标签",
				count: h1Matches.length,
			});
			totalIssues++;
		}
	}

	log(colors.blue, `📊 检查文件: ${astroFiles.length}`);
	log(colors.yellow, `⚠️  发现问题: ${totalIssues}个\n`);

	if (issues.length > 0) {
		issues.forEach((issue) => {
			log(colors.red, `${issue.type}: ${issue.file} (${issue.count}个)`);
		});
	} else {
		log(colors.green, "✅ 所有页面H1标签检查通过！");
	}

	return { files: astroFiles.length, issues: totalIssues };
}

async function checkDuplicates() {
	log(colors.cyan, "\n\n🔍 检查重复内容...\n");

	const postsDir = path.join(__dirname, "../src/content/posts");
	const allFiles = getAllFiles(postsDir);
	const mdFiles = allFiles.filter((f) => f.endsWith(".md"));

	const titles = {};
	const descriptions = {};
	let duplicateTitles = 0;
	let duplicateDescriptions = 0;

	for (const file of mdFiles) {
		const content = fs.readFileSync(file, "utf-8");
		const frontmatter = parseFrontmatter(content);

		if (!frontmatter) continue;

		const { title, description } = frontmatter;
		const relativePath = path.relative(postsDir, file);

		// 检查重复标题
		if (title) {
			if (!titles[title]) {
				titles[title] = [];
			}
			titles[title].push(relativePath);
		}

		// 检查重复描述
		if (description) {
			if (!descriptions[description]) {
				descriptions[description] = [];
			}
			descriptions[description].push(relativePath);
		}
	}

	// 输出重复标题
	log(colors.yellow, "📋 重复标题:");
	Object.entries(titles).forEach(([title, files]) => {
		if (files.length > 1) {
			log(colors.red, `\n⚠️  "${title}"`);
			files.forEach((f) => console.log(`   - ${f}`));
			duplicateTitles++;
		}
	});

	if (duplicateTitles === 0) {
		log(colors.green, "✅ 没有重复标题");
	}

	// 输出重复描述
	log(colors.yellow, "\n📋 重复描述:");
	Object.entries(descriptions).forEach(([desc, files]) => {
		if (files.length > 1) {
			log(colors.red, `\n⚠️  "${desc.substring(0, 50)}..."`);
			files.forEach((f) => console.log(`   - ${f}`));
			duplicateDescriptions++;
		}
	});

	if (duplicateDescriptions === 0) {
		log(colors.green, "✅ 没有重复描述");
	}

	return { duplicateTitles, duplicateDescriptions };
}

async function generateReport() {
	log(colors.cyan, "\n" + "=".repeat(60));
	log(colors.cyan, "🔍 SEO检查报告");
	log(colors.cyan, "=".repeat(60));

	const postResults = await checkPosts();
	const h1Results = await checkH1Tags();
	const duplicateResults = await checkDuplicates();

	log(colors.cyan, "\n" + "=".repeat(60));
	log(colors.cyan, "📊 总结");
	log(colors.cyan, "=".repeat(60));
	log(colors.blue, `总文章数: ${postResults.posts}`);
	log(colors.yellow, `文章SEO问题: ${postResults.issues}个`);
	log(colors.yellow, `H1标签问题: ${h1Results.issues}个`);
	log(colors.yellow, `重复标题: ${duplicateResults.duplicateTitles}个`);
	log(colors.yellow, `重复描述: ${duplicateResults.duplicateDescriptions}个`);

	const totalIssues =
		postResults.issues +
		h1Results.issues +
		duplicateResults.duplicateTitles +
		duplicateResults.duplicateDescriptions;

	if (totalIssues === 0) {
		log(colors.green, "\n✅ 恭喜！所有SEO检查通过！");
	} else {
		log(colors.red, `\n⚠️  总计发现 ${totalIssues} 个问题需要修复`);
	}

	log(colors.cyan, "\n");
}

generateReport().catch(console.error);
