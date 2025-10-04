#!/usr/bin/env node

/**
 * 图片优化脚本
 * 优化 Banner 和头像图片,生成 WebP/AVIF 格式和多尺寸响应式版本
 */

import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// 配置
const CONFIG = {
	banner: {
		input: path.join(projectRoot, "src/assets/images/banner.png"),
		outputDir: path.join(projectRoot, "public/images/banner"),
		sizes: [640, 1024, 1920],
		quality: {
			webp: 85,
			avif: 80,
			jpeg: 85,
		},
	},
	avatar: {
		input: path.join(projectRoot, "src/assets/images/avatar.png"),
		outputDir: path.join(projectRoot, "public/images/avatar"),
		sizes: [128, 256, 512],
		quality: {
			webp: 90,
			avif: 85,
			png: 90,
		},
	},
};

/**
 * 确保目录存在
 */
async function ensureDir(dir) {
	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });
		console.log(`📁 创建目录: ${dir}`);
	}
}

/**
 * 获取文件大小(KB)
 */
async function getFileSize(filePath) {
	try {
		const stats = await fs.stat(filePath);
		return (stats.size / 1024).toFixed(2);
	} catch {
		return 0;
	}
}

/**
 * 优化 Banner 图片
 */
async function optimizeBanner() {
	console.log("\n🎨 开始优化 Banner 图片...");

	const { input, outputDir, sizes, quality } = CONFIG.banner;
	await ensureDir(outputDir);

	const originalSize = await getFileSize(input);
	console.log(`📊 原始文件大小: ${originalSize} KB`);

	const results = [];

	// 生成多尺寸和多格式版本
	for (const width of sizes) {
		const basename = `banner-${width}w`;

		// WebP 格式
		const webpPath = path.join(outputDir, `${basename}.webp`);
		await sharp(input)
			.resize(width, null, { withoutEnlargement: true })
			.webp({ quality: quality.webp, effort: 6 })
			.toFile(webpPath);

		const webpSize = await getFileSize(webpPath);
		results.push({ format: "WebP", width, size: webpSize, path: webpPath });

		// AVIF 格式
		const avifPath = path.join(outputDir, `${basename}.avif`);
		await sharp(input)
			.resize(width, null, { withoutEnlargement: true })
			.avif({ quality: quality.avif, effort: 6 })
			.toFile(avifPath);

		const avifSize = await getFileSize(avifPath);
		results.push({ format: "AVIF", width, size: avifSize, path: avifPath });

		// JPEG 备用格式
		const jpegPath = path.join(outputDir, `${basename}.jpg`);
		await sharp(input)
			.resize(width, null, { withoutEnlargement: true })
			.jpeg({ quality: quality.jpeg, progressive: true })
			.toFile(jpegPath);

		const jpegSize = await getFileSize(jpegPath);
		results.push({ format: "JPEG", width, size: jpegSize, path: jpegPath });
	}

	// 统计
	console.log("\n✅ Banner 优化完成:");
	results.forEach((r) => {
		console.log(`  - ${r.format} ${r.width}w: ${r.size} KB`);
	});

	const totalSaved =
		originalSize - Math.min(...results.map((r) => Number.parseFloat(r.size)));
	console.log(
		`\n💾 最佳压缩节省: ${totalSaved.toFixed(2)} KB (${((totalSaved / originalSize) * 100).toFixed(1)}%)`,
	);
}

/**
 * 优化头像图片
 */
async function optimizeAvatar() {
	console.log("\n👤 开始优化头像图片...");

	const { input, outputDir, sizes, quality } = CONFIG.avatar;
	await ensureDir(outputDir);

	const originalSize = await getFileSize(input);
	console.log(`📊 原始文件大小: ${originalSize} KB`);

	const results = [];

	// 生成多尺寸版本
	for (const size of sizes) {
		const basename = `avatar-${size}`;

		// WebP 格式
		const webpPath = path.join(outputDir, `${basename}.webp`);
		await sharp(input)
			.resize(size, size, { fit: "cover" })
			.webp({ quality: quality.webp, effort: 6 })
			.toFile(webpPath);

		const webpSize = await getFileSize(webpPath);
		results.push({
			format: "WebP",
			size: `${size}x${size}`,
			fileSize: webpSize,
		});

		// AVIF 格式
		const avifPath = path.join(outputDir, `${basename}.avif`);
		await sharp(input)
			.resize(size, size, { fit: "cover" })
			.avif({ quality: quality.avif, effort: 6 })
			.toFile(avifPath);

		const avifSize = await getFileSize(avifPath);
		results.push({
			format: "AVIF",
			size: `${size}x${size}`,
			fileSize: avifSize,
		});

		// PNG 备用格式(保留透明度)
		const pngPath = path.join(outputDir, `${basename}.png`);
		await sharp(input)
			.resize(size, size, { fit: "cover" })
			.png({ quality: quality.png, compressionLevel: 9 })
			.toFile(pngPath);

		const pngSize = await getFileSize(pngPath);
		results.push({ format: "PNG", size: `${size}x${size}`, fileSize: pngSize });
	}

	// 统计
	console.log("\n✅ 头像优化完成:");
	results.forEach((r) => {
		console.log(`  - ${r.format} ${r.size}: ${r.fileSize} KB`);
	});
}

/**
 * 主函数
 */
async function main() {
	console.log("🚀 开始图片优化...\n");

	try {
		await optimizeBanner();
		await optimizeAvatar();

		console.log("\n✨ 所有图片优化完成!");
		console.log("\n📝 后续步骤:");
		console.log("  1. 更新 Layout.astro 中的 Banner 引用");
		console.log("  2. 更新 Profile.astro 中的头像引用");
		console.log("  3. 使用 <picture> 元素支持多格式");
	} catch (error) {
		console.error("\n❌ 优化过程出错:", error);
		process.exit(1);
	}
}

main();
