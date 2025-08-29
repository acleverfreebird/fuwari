import { getSortedPosts } from "@utils/content-utils";
import { getPostUrlBySlug } from "@utils/url-utils";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ site }) => {
	const posts = await getSortedPosts();
	const baseUrl = site?.href || "https://freebird2913.tech/";

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 主页 -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- 关于页面 -->
  <url>
    <loc>${baseUrl}about/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- 归档页面 -->
  <url>
    <loc>${baseUrl}archive/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- 朋友页面 -->
  <url>
    <loc>${baseUrl}friends/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- 博客文章 -->
  ${posts
		.map(
			(post) => `
  <url>
    <loc>${baseUrl}posts/${post.slug}/</loc>
    <lastmod>${post.data.updated ? post.data.updated.toISOString() : post.data.published.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`,
		)
		.join("")}
</urlset>`;

	return new Response(sitemap.trim(), {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
		},
	});
};
