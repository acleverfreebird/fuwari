// 页面分析脚本 - 处理访问量和阅读量追踪
(() => {
	// 配置
	const CONFIG = {
		READ_THRESHOLD: 0.75, // 阅读阈值，滚动到75%时计算为阅读
		API_BASE: "/api",
		DEBOUNCE_DELAY: 100, // 防抖延迟
		RETRY_ATTEMPTS: 3, // 重试次数
		RETRY_DELAY: 1000, // 重试延迟
	};

	// 状态管理
	const state = {
		hasViewed: false,
		hasRead: false,
		slug: null,
		isScrolling: false,
	};

	// 获取当前文章的 slug
	function getSlugFromPath() {
		const path = window.location.pathname;
		const match = path.match(/\/posts\/([^/]+)\/?$/);
		return match ? match[1] : null;
	}

	// 防抖函数
	function debounce(func, delay) {
		let timeoutId;
		return function (...args) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func.apply(this, args), delay);
		};
	}

	// 发送 API 请求（带重试机制）
	async function apiRequest(
		endpoint,
		options = {},
		attempts = CONFIG.RETRY_ATTEMPTS,
	) {
		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				...options,
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error(`API request failed (${attempts} attempts left):`, error);

			if (attempts > 1) {
				await new Promise((resolve) => setTimeout(resolve, CONFIG.RETRY_DELAY));
				return apiRequest(endpoint, options, attempts - 1);
			}

			throw error;
		}
	}

	// 更新页面显示的计数
	function updateDisplay(type, count) {
		const element = document.getElementById(`${type}-count`);
		if (element) {
			element.textContent = count;
		}
	}

	// 增加访问量
	async function incrementViews() {
		if (state.hasViewed || !state.slug) return;

		try {
			const result = await apiRequest(`${CONFIG.API_BASE}/views/${state.slug}`);

			if (result.incremented) {
				updateDisplay("view", result.views);
				state.hasViewed = true;
				console.log(`访问量已增加: ${state.slug} -> ${result.views}`);
			}
		} catch (error) {
			console.error("增加访问量失败:", error);
		}
	}

	// 增加阅读量
	async function incrementReads() {
		if (state.hasRead || !state.slug) return;

		try {
			const result = await apiRequest(`${CONFIG.API_BASE}/reads/${state.slug}`);

			if (result.incremented) {
				updateDisplay("read", result.reads);
				state.hasRead = true;
				console.log(`阅读量已增加: ${state.slug} -> ${result.reads}`);
			}
		} catch (error) {
			console.error("增加阅读量失败:", error);
		}
	}

	// 获取当前统计数据
	async function fetchCurrentStats() {
		if (!state.slug) return;

		try {
			const response = await fetch(`${CONFIG.API_BASE}/stats/${state.slug}`);
			if (response.ok) {
				const result = await response.json();
				updateDisplay("view", result.views);
				updateDisplay("read", result.reads);
			}
		} catch (error) {
			console.error("获取统计数据失败:", error);
		}
	}

	// 计算页面滚动百分比
	function getScrollPercentage() {
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		const windowHeight = window.innerHeight;
		const docHeight = document.documentElement.scrollHeight;
		const totalDocScrollLength = docHeight - windowHeight;

		if (totalDocScrollLength <= 0) return 100;

		return Math.round((scrollTop / totalDocScrollLength) * 100);
	}

	// 滚动事件处理器（防抖）
	const handleScroll = debounce(() => {
		if (state.hasRead) return;

		const scrollPercentage = getScrollPercentage();

		if (scrollPercentage >= CONFIG.READ_THRESHOLD * 100) {
			incrementReads();
		}
	}, CONFIG.DEBOUNCE_DELAY);

	// 页面可见性变化处理
	function handleVisibilityChange() {
		if (document.hidden) {
			// 页面隐藏时，移除滚动监听器以节省资源
			window.removeEventListener("scroll", handleScroll);
		} else {
			// 页面重新可见时，重新添加滚动监听器并刷新统计
			window.addEventListener("scroll", handleScroll, { passive: true });
			setTimeout(fetchCurrentStats, 500);
		}
	}

	// 初始化函数
	function init() {
		// 获取当前文章的 slug
		state.slug = getSlugFromPath();

		if (!state.slug) {
			console.log("非文章页面，跳过统计追踪");
			return;
		}

		console.log(`初始化页面统计追踪: ${state.slug}`);

		// 页面加载完成后立即获取当前统计数据
		fetchCurrentStats();

		// 页面加载完成后立即增加访问量
		setTimeout(incrementViews, 500);

		// 监听滚动事件来追踪阅读量
		window.addEventListener("scroll", handleScroll, { passive: true });

		// 监听页面可见性变化
		document.addEventListener("visibilitychange", handleVisibilityChange);

		// 页面卸载前的清理
		window.addEventListener("beforeunload", () => {
			window.removeEventListener("scroll", handleScroll);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		});
	}

	// DOM 加载完成后初始化
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
