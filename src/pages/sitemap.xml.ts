import { getSortedPosts } from "@utils/content-utils";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ site }) => {
	const posts = await getSortedPosts();
	const baseUrl = site?.href || "https://www.freebird2913.tech/";
	const currentDate = new Date().toISOString();

	// 根据文章发布时间动态调整优先级和更新频率
	const getPostPriority = (publishedDate: Date) => {
		const daysSincePublished = Math.floor(
			(Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24),
		);
		if (daysSincePublished < 7) return 0.9; // 新文章高优先级
		if (daysSincePublished < 30) return 0.8;
		if (daysSincePublished < 90) return 0.7;
		return 0.6;
	};

	const getPostChangefreq = (publishedDate: Date, updatedDate?: Date) => {
		const daysSincePublished = Math.floor(
			(Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24),
		);
		const hasRecentUpdate =
			updatedDate &&
			Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)) <
				30;

		if (hasRecentUpdate) return "weekly";
		if (daysSincePublished < 30) return "weekly";
		if (daysSincePublished < 90) return "monthly";
		return "yearly";
	};

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- 主页 -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- 关于页面 -->
  <url>
    <loc>${baseUrl}about/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- 归档页面 -->
  <url>
    <loc>${baseUrl}archive/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- 朋友页面 -->
  <url>
    <loc>${baseUrl}friends/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- 博客文章 -->
  ${posts
		.map((post) => {
			const priority = getPostPriority(post.data.published);
			const changefreq = getPostChangefreq(
				post.data.published,
				post.data.updated,
			);
			const lastmod = post.data.updated
				? post.data.updated.toISOString()
				: post.data.published.toISOString();
			const imageUrl = post.data.image
				? `${baseUrl}${post.data.image}`
				: `${baseUrl}assets/images/banner.png`;

			return `
  <url>
    <loc>${baseUrl}posts/${post.slug}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${post.data.title}</image:title>
      <image:caption>${post.data.description || post.data.title}</image:caption>
    </image:image>
  </url>`;
		})
		.join("")}
</urlset>`;

	return new Response(sitemap.trim(), {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
		},
	});
};
