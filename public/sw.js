// Service Worker for Performance Optimization
// Version 2.0 - Optimized for Speed Insights

const CACHE_VERSION = "v2.0";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// 需要预缓存的关键静态资源
const STATIC_ASSETS = ["/", "/offline/"];

// 安装事件 - 预缓存静态资源
self.addEventListener("install", (event) => {
	console.log("[SW] Installing Service Worker...");
	event.waitUntil(
		caches
			.open(STATIC_CACHE)
			.then((cache) => {
				console.log("[SW] Precaching static assets");
				return cache.addAll(STATIC_ASSETS);
			})
			.catch((error) => {
				console.error("[SW] Precaching failed:", error);
			}),
	);
	self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener("activate", (event) => {
	console.log("[SW] Activating Service Worker...");
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => {
						return (
							name.startsWith("static-") ||
							name.startsWith("dynamic-") ||
							name.startsWith("images-")
						);
					})
					.filter((name) => {
						return (
							name !== STATIC_CACHE &&
							name !== DYNAMIC_CACHE &&
							name !== IMAGE_CACHE
						);
					})
					.map((name) => {
						console.log("[SW] Deleting old cache:", name);
						return caches.delete(name);
					}),
			);
		}),
	);
	self.clients.claim();
});

// Fetch 事件 - 实施缓存策略
self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// 跳过非 GET 请求
	if (request.method !== "GET") return;

	// 跳过 Chrome 扩展和其他协议
	if (url.protocol !== "http:" && url.protocol !== "https:") return;

	// 跳过外部域名（除了字体和分析）
	if (
		url.origin !== location.origin &&
		!url.hostname.includes("fonts.googleapis.com") &&
		!url.hostname.includes("fonts.gstatic.com")
	) {
		return;
	}

	// API 请求 - Network First with timeout
	if (url.pathname.startsWith("/api/")) {
		event.respondWith(networkFirstWithTimeout(request, DYNAMIC_CACHE, 3000));
		return;
	}

	// 图片请求 - Cache First
	if (
		request.destination === "image" ||
		url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|avif|ico)$/i)
	) {
		event.respondWith(cacheFirst(request, IMAGE_CACHE));
		return;
	}

	// 静态资源 (_astro, fonts) - Cache First
	if (
		url.pathname.startsWith("/_astro/") ||
		url.pathname.startsWith("/fonts/") ||
		url.pathname.match(/\.(js|css|woff|woff2|ttf)$/i)
	) {
		event.respondWith(cacheFirst(request, STATIC_CACHE));
		return;
	}

	// Pagefind 搜索资源 - Network First with graceful fallback
	if (url.pathname.startsWith("/pagefind/")) {
		event.respondWith(
			(async () => {
				try {
					const response = await fetch(request);
					// 只缓存成功的响应
					if (response && response.ok) {
						const cache = await caches.open(STATIC_CACHE);
						cache.put(request, response.clone());
					}
					return response;
				} catch (error) {
					// 尝试从缓存获取
					const cache = await caches.open(STATIC_CACHE);
					const cached = await cache.match(request);
					if (cached) {
						return cached;
					}
					// 返回空的 JSON 响应而不是错误，避免破坏搜索功能
					return new Response('{"results":[]}', {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}
			})(),
		);
		return;
	}

	// HTML 页面 - Network First with Cache Fallback
	if (
		request.destination === "document" ||
		url.pathname.endsWith("/") ||
		url.pathname.endsWith(".html")
	) {
		event.respondWith(networkFirst(request, DYNAMIC_CACHE));
		return;
	}

	// 其他请求 - Network First
	event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// Cache First 策略 - 优先使用缓存
async function cacheFirst(request, cacheName) {
	try {
		const cache = await caches.open(cacheName);
		const cached = await cache.match(request);

		if (cached) {
			// 后台更新缓存（stale-while-revalidate）
			fetch(request)
				.then((response) => {
					if (response && response.ok) {
						cache.put(request, response.clone());
					}
				})
				.catch(() => {
					// 静默失败，使用缓存版本
				});

			return cached;
		}

		// 缓存未命中，从网络获取
		const response = await fetch(request);
		if (response && response.ok) {
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		console.error("[SW] Cache First failed:", error);
		throw error;
	}
}

// Network First 策略 - 优先使用网络
async function networkFirst(request, cacheName) {
	const cache = await caches.open(cacheName);

	try {
		const response = await fetch(request);
		if (response && response.ok) {
			// 只缓存成功的响应
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		console.log("[SW] Network failed, trying cache:", request.url);
		const cached = await cache.match(request);

		if (cached) {
			return cached;
		}

		// 如果是 HTML 请求且缓存未命中，返回离线页面
		if (request.destination === "document") {
			const offlinePage = await cache.match("/offline/");
			if (offlinePage) {
				return offlinePage;
			}
		}

		throw error;
	}
}

// Network First with Timeout - 带超时的网络优先策略
async function networkFirstWithTimeout(request, cacheName, timeout = 3000) {
	const cache = await caches.open(cacheName);

	try {
		// 创建超时 Promise
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error("Network timeout")), timeout);
		});

		// 竞速：网络请求 vs 超时
		const response = await Promise.race([fetch(request), timeoutPromise]);

		if (response && response.ok) {
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		console.log("[SW] Network timeout or failed, using cache:", request.url);
		const cached = await cache.match(request);

		if (cached) {
			return cached;
		}

		throw error;
	}
}

// 监听消息事件（用于手动触发缓存更新等）
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}

	if (event.data && event.data.type === "CLEAR_CACHE") {
		event.waitUntil(
			caches.keys().then((cacheNames) => {
				return Promise.all(
					cacheNames.map((cacheName) => caches.delete(cacheName)),
				);
			}),
		);
	}
});

console.log("[SW] Service Worker loaded successfully");
