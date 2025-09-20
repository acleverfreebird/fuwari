import { Redis } from "@upstash/redis";

// 缓存 Redis 实例以避免重复初始化
let cachedRedisClient: Redis | null | undefined;

const getRedisClient = (): Redis | null => {
	// 如果已经初始化过，直接返回缓存的实例
	if (cachedRedisClient !== undefined) {
		return cachedRedisClient;
	}

	// 支持多种环境变量格式
	const redisUrl =
		import.meta.env.UPSTASH_REDIS_REST_URL ||
		(typeof process !== "undefined"
			? process.env.UPSTASH_REDIS_REST_URL
			: undefined);
	const redisToken =
		import.meta.env.UPSTASH_REDIS_REST_TOKEN ||
		(typeof process !== "undefined"
			? process.env.UPSTASH_REDIS_REST_TOKEN
			: undefined);

	if (!redisUrl || !redisToken) {
		console.warn(
			"[REDIS] Configuration missing. UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set.",
		);
		cachedRedisClient = null;
		return null;
	}

	try {
		cachedRedisClient = new Redis({
			url: redisUrl,
			token: redisToken,
		});
		console.log("[REDIS] Client initialized successfully");
		return cachedRedisClient;
	} catch (error) {
		console.error("[REDIS] Failed to initialize client:", error);
		cachedRedisClient = null;
		return null;
	}
};

// 通用的计数操作函数
export const incrementCount = async (key: string): Promise<number> => {
	const redis = getRedisClient();
	if (!redis) {
		console.warn(`[REDIS] ⚠️  Cannot increment ${key} - Redis not available`);
		return 1; // 返回默认值
	}

	try {
		const startTime = Date.now();
		const count = await redis.incr(key);
		const duration = Date.now() - startTime;

		console.log(`[REDIS] ✅ Incremented ${key} to ${count} (${duration}ms)`);
		return count;
	} catch (error) {
		console.error(`[REDIS] ❌ Error incrementing ${key}:`, error);

		// 尝试重新初始化Redis连接
		cachedRedisClient = undefined;

		return 1;
	}
};

// 通用的获取计数函数
export const getCount = async (key: string): Promise<number> => {
	const redis = getRedisClient();
	if (!redis) {
		console.warn(`[REDIS] Cannot get ${key} - Redis not available`);
		// 返回基于slug的模拟数据
		const hash = key.split("").reduce((acc, char) => {
			const newAcc = (acc << 5) - acc + char.charCodeAt(0);
			return newAcc & newAcc;
		}, 0);
		return (Math.abs(hash) % 100) + 10;
	}

	try {
		const count = await redis.get(key);
		return Number(count) || 0;
	} catch (error) {
		console.error(`[REDIS] Error getting ${key}:`, error);
		return 0;
	}
};

// 批量获取计数函数（用于总计）
export const getTotalCounts = async (): Promise<{
	totalViews: number;
	totalReads: number;
}> => {
	const redis = getRedisClient();
	if (!redis) {
		console.warn("[REDIS] Cannot get total counts - Redis not available");
		return { totalViews: 1234, totalReads: 567 }; // 返回模拟数据
	}

	try {
		const startTime = Date.now();

		const [viewKeys, readKeys] = await Promise.all([
			redis.keys("views:*"),
			redis.keys("reads:*"),
		]);

		console.log(
			`[REDIS] Found ${viewKeys.length} view keys, ${readKeys.length} read keys`,
		);

		let totalViews = 0;
		let totalReads = 0;

		if (viewKeys.length > 0) {
			const views = await redis.mget(...viewKeys);
			totalViews = (views as (string | null)[]).reduce(
				(sum: number, current: string | null) => sum + (Number(current) || 0),
				0,
			);
		}

		if (readKeys.length > 0) {
			const reads = await redis.mget(...readKeys);
			totalReads = (reads as (string | null)[]).reduce(
				(sum: number, current: string | null) => sum + (Number(current) || 0),
				0,
			);
		}

		const duration = Date.now() - startTime;
		console.log(
			`[REDIS] Total counts calculated in ${duration}ms: views=${totalViews}, reads=${totalReads}`,
		);

		return { totalViews, totalReads };
	} catch (error) {
		console.error("[REDIS] Error getting total counts:", error);
		return { totalViews: 0, totalReads: 0 };
	}
};

export default getRedisClient;
