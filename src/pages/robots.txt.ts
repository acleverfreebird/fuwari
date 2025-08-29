import type { APIRoute } from "astro";

const robotsTxt = `
User-agent: *
Disallow: /_astro/
Disallow: /api/
Disallow: /.netlify/
Allow: /

# 允许搜索引擎抓取主要内容
Allow: /posts/
Allow: /about/
Allow: /archive/
Allow: /sitemap.xml

# 网站地图
Sitemap: ${new URL("sitemap.xml", import.meta.env.SITE).href}

# 抓取延迟设置
Crawl-delay: 1

# 针对特定搜索引擎的优化
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Baiduspider
Allow: /
Crawl-delay: 2
`.trim();

export const GET: APIRoute = () => {
	return new Response(robotsTxt, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
