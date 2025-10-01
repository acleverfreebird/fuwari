import type { APIRoute } from "astro";

const robotsTxt = `
User-agent: *
Disallow: /_astro/
Disallow: /api/
Disallow: /.vercel/
Disallow: /scripts/
Allow: /

# 允许搜索引擎抓取主要内容
Allow: /posts/
Allow: /about/
Allow: /archive/
Allow: /friends/
Allow: /sitemap.xml
Allow: /rss.xml
Allow: /manifest.json

# 网站地图
Sitemap: ${new URL("sitemap.xml", import.meta.env.SITE).href}

# RSS订阅
Sitemap: ${new URL("rss.xml", import.meta.env.SITE).href}

# 抓取延迟设置
Crawl-delay: 1

# 针对Google搜索引擎的优化
User-agent: Googlebot
Allow: /
Crawl-delay: 0.5

# 针对必应搜索引擎的优化
User-agent: Bingbot
Allow: /
Crawl-delay: 1

# 针对百度搜索引擎的优化
User-agent: Baiduspider
Allow: /
Crawl-delay: 2

# 针对搜狗搜索引擎的优化
User-agent: Sogou web spider
Allow: /
Crawl-delay: 2

# 针对360搜索引擎的优化
User-agent: 360Spider
Allow: /
Crawl-delay: 2

# 针对头条搜索引擎的优化
User-agent: ByteDance
Allow: /
Crawl-delay: 1

# 阻止垃圾爬虫
User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /
`.trim();

export const GET: APIRoute = () => {
	return new Response(robotsTxt, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
