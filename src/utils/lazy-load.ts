/**
 * 图片懒加载工具
 * 使用 Intersection Observer API 实现高性能的图片懒加载
 */

interface LazyLoadOptions {
	rootMargin?: string;
	threshold?: number;
	loadingClass?: string;
	loadedClass?: string;
	errorClass?: string;
}

const defaultOptions: LazyLoadOptions = {
	rootMargin: "50px",
	threshold: 0.01,
	loadingClass: "lazy-loading",
	loadedClass: "lazy-loaded",
	errorClass: "lazy-error",
};

/**
 * 设置图片懒加载
 * @param selector - 图片选择器，默认 'img[data-src]'
 * @param options - 配置选项
 */
export function setupLazyLoad(
	selector = "img[data-src]",
	options: LazyLoadOptions = {},
): void {
	const config = { ...defaultOptions, ...options };

	// 检查浏览器是否支持 Intersection Observer
	if (!("IntersectionObserver" in window)) {
		// 降级方案：直接加载所有图片
		loadAllImages(selector);
		return;
	}

	const imageObserver = new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const img = entry.target as HTMLImageElement;
					loadImage(img, config);
					observer.unobserve(img);
				}
			});
		},
		{
			rootMargin: config.rootMargin,
			threshold: config.threshold,
		},
	);

	// 观察所有匹配的图片
	const images = document.querySelectorAll<HTMLImageElement>(selector);
	images.forEach((img) => {
		if (config.loadingClass) {
			img.classList.add(config.loadingClass);
		}
		imageObserver.observe(img);
	});
}

/**
 * 加载单张图片
 */
function loadImage(img: HTMLImageElement, config: LazyLoadOptions): void {
	const src = img.dataset.src;
	const srcset = img.dataset.srcset;

	if (!src) return;

	// 创建临时图片对象预加载
	const tempImg = new Image();

	tempImg.onload = () => {
		img.src = src;
		if (srcset) {
			img.srcset = srcset;
		}
		if (config.loadingClass) {
			img.classList.remove(config.loadingClass);
		}
		if (config.loadedClass) {
			img.classList.add(config.loadedClass);
		}

		// 移除 data 属性
		delete img.dataset.src;
		delete img.dataset.srcset;
	};

	tempImg.onerror = () => {
		if (config.loadingClass) {
			img.classList.remove(config.loadingClass);
		}
		if (config.errorClass) {
			img.classList.add(config.errorClass);
		}
		console.error(`Failed to load image: ${src}`);
	};

	tempImg.src = src;
}

/**
 * 降级方案：直接加载所有图片
 */
function loadAllImages(selector: string): void {
	const images = document.querySelectorAll<HTMLImageElement>(selector);
	images.forEach((img) => {
		const src = img.dataset.src;
		const srcset = img.dataset.srcset;

		if (src) {
			img.src = src;
			delete img.dataset.src;
		}
		if (srcset) {
			img.srcset = srcset;
			delete img.dataset.srcset;
		}
	});
}

/**
 * 预加载指定的图片
 * @param urls - 图片URL数组
 */
export function preloadImages(urls: string[]): Promise<unknown[]> {
	const promises = urls.map(
		(url) =>
			new Promise<unknown>((resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve(undefined);
				img.onerror = reject;
				img.src = url;
			}),
	);
	return Promise.all(promises);
}

/**
 * 响应式图片加载
 * 根据设备像素比和视口大小选择合适的图片
 */
export function getResponsiveImageUrl(
	sizes: { width: number; url: string }[],
): string {
	const dpr = window.devicePixelRatio || 1;
	const viewportWidth = window.innerWidth * dpr;

	// 找到最接近的图片尺寸
	const suitable = sizes
		.filter((size) => size.width >= viewportWidth)
		.sort((a, b) => a.width - b.width)[0];

	return suitable ? suitable.url : sizes[sizes.length - 1].url;
}
