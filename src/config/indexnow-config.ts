// IndexNow 配置管理
export interface IndexNowConfig {
	siteUrl: string;
	apiKey: string;
	keyLocation: string;
	endpoints: string[];
	retryConfig: {
		maxRetries: number;
		initialDelay: number;
		maxDelay: number;
		backoffFactor: number;
	};
	rateLimiting: {
		maxRequestsPerMinute: number;
		batchSize: number;
		maxBatchSize: number;
	};
	caching: {
		enabled: boolean;
		cacheDuration: number; // 缓存持续时间（毫秒）
	};
}

// 默认配置
export const DEFAULT_INDEXNOW_CONFIG: IndexNowConfig = {
	siteUrl: "https://www.freebird2913.tech",
	apiKey: "f494d9ef355649f38fb34bf5740376c8",
	keyLocation:
		"https://www.freebird2913.tech/f494d9ef355649f38fb34bf5740376c8.txt",
	endpoints: [
		"https://api.indexnow.org/indexnow",
		"https://www.bing.com/indexnow",
		"https://yandex.com/indexnow",
	],
	retryConfig: {
		maxRetries: 3,
		initialDelay: 1000, // 1秒
		maxDelay: 10000, // 10秒
		backoffFactor: 2,
	},
	rateLimiting: {
		maxRequestsPerMinute: 10,
		batchSize: 100, // 每批次推送的URL数量
		maxBatchSize: 10000, // 最大批次大小
	},
	caching: {
		enabled: true,
		cacheDuration: 24 * 60 * 60 * 1000, // 24小时
	},
};

// 环境变量配置覆盖
export function getIndexNowConfig(): IndexNowConfig {
	const config = { ...DEFAULT_INDEXNOW_CONFIG };

	// 从环境变量读取配置（如果存在）
	if (process?.env) {
		if (process.env.INDEXNOW_SITE_URL) {
			config.siteUrl = process.env.INDEXNOW_SITE_URL;
		}
		if (process.env.INDEXNOW_API_KEY) {
			config.apiKey = process.env.INDEXNOW_API_KEY;
		}
		if (process.env.INDEXNOW_KEY_LOCATION) {
			config.keyLocation = process.env.INDEXNOW_KEY_LOCATION;
		}
		if (process.env.INDEXNOW_MAX_RETRIES) {
			config.retryConfig.maxRetries = Number.parseInt(
				process.env.INDEXNOW_MAX_RETRIES,
				10,
			);
		}
		if (process.env.INDEXNOW_BATCH_SIZE) {
			config.rateLimiting.batchSize = Number.parseInt(
				process.env.INDEXNOW_BATCH_SIZE,
				10,
			);
		}
	}

	return config;
}

// 验证配置有效性
export function validateConfig(config: IndexNowConfig): boolean {
	if (!config.siteUrl || !config.apiKey) {
		console.error("[IndexNow] 配置无效: 缺少必要的站点URL或API密钥");
		return false;
	}

	try {
		new URL(config.siteUrl);
		new URL(config.keyLocation);
	} catch {
		console.error("[IndexNow] 配置无效: 站点URL或密钥位置格式错误");
		return false;
	}

	if (config.endpoints.length === 0) {
		console.error("[IndexNow] 配置无效: 没有配置API端点");
		return false;
	}

	return true;
}
