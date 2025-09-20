import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { expressiveCodeConfig } from "@/config";
import type { LIGHT_DARK_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset?.hue || fallback, 10);
}

export function getHue(): number {
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	switch (theme) {
		case LIGHT_MODE:
			document.documentElement.classList.remove("dark");
			break;
		case DARK_MODE:
			document.documentElement.classList.add("dark");
			break;
		case AUTO_MODE:
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			break;
	}

	// Set the theme for Expressive Code
	document.documentElement.setAttribute(
		"data-theme",
		expressiveCodeConfig.theme,
	);
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);

	// 触发主题变化事件，通知评论组件和其他组件
	const themeChangeEvent = new CustomEvent("themeChanged", {
		detail: { theme, timestamp: Date.now() },
	});
	document.dispatchEvent(themeChangeEvent);

	// 调用全局的 Giscus 更新函数（如果存在）
	if (typeof window.updateGiscusTheme === "function") {
		// 延迟调用以确保主题已应用到 DOM
		setTimeout(() => {
			window.updateGiscusTheme?.();
		}, 100);
	}

	// 备用的 Giscus 主题更新机制（保持兼容性）
	const sendGiscusTheme = (retryCount = 0) => {
		const maxRetries = 5;
		const giscusFrame = document.querySelector(
			"iframe.giscus-frame",
		) as HTMLIFrameElement;

		if (giscusFrame?.contentWindow) {
			let giscusTheme: string;
			switch (theme) {
				case LIGHT_MODE:
					giscusTheme = "light";
					break;
				case DARK_MODE:
					giscusTheme = "dark";
					break;
				default:
					giscusTheme = "preferred_color_scheme";
					break;
			}

			try {
				giscusFrame.contentWindow.postMessage(
					{
						giscus: {
							setConfig: {
								theme: giscusTheme,
							},
						},
					},
					"https://giscus.app",
				);
			} catch (error) {
				console.warn("Failed to update Giscus theme via backup method:", error);
			}
		} else if (retryCount < maxRetries) {
			// 如果 iframe 未找到且还有重试次数，延迟重试
			setTimeout(() => sendGiscusTheme(retryCount + 1), 300);
		}
	};

	// 延迟执行备用更新机制
	setTimeout(() => sendGiscusTheme(), 200);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}
