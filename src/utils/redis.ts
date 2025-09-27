import { createClient } from "redis";

// 创建 Redis 客户端
let client: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
	if (!client) {
		client = createClient({
			url: process.env.REDIS_URL,
		});

		client.on("error", (err) => {
			console.error("Redis Client Error:", err);
		});

		await client.connect();
	}

	return client;
}

// Redis 操作函数
export async function kvGet(key: string): Promise<string | null> {
	try {
		const redis = await getRedisClient();
		return await redis.get(key);
	} catch (error) {
		console.error("Redis GET error:", error);
		return null;
	}
}

export async function kvSet(key: string, value: string): Promise<void> {
	try {
		const redis = await getRedisClient();
		await redis.set(key, value);
	} catch (error) {
		console.error("Redis SET error:", error);
	}
}

export async function kvIncr(key: string): Promise<number> {
	try {
		const redis = await getRedisClient();
		return await redis.incr(key);
	} catch (error) {
		console.error("Redis INCR error:", error);
		return 0;
	}
}

// 清理连接
export async function closeRedis() {
	if (client) {
		await client.quit();
		client = null;
	}
}
