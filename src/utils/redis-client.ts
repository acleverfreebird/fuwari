import { Redis } from "@upstash/redis";

const getRedisClient = (): Redis | null => {
	const redisUrl = import.meta.env.UPSTASH_REDIS_REST_URL;
	const redisToken = import.meta.env.UPSTASH_REDIS_REST_TOKEN;

	if (!redisUrl || !redisToken) {
		console.warn(
			"Redis configuration is missing. UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set.",
		);
		return null;
	}

	try {
		return new Redis({
			url: redisUrl,
			token: redisToken,
		});
	} catch (error) {
		console.error("Failed to initialize Redis client:", error);
		return null;
	}
};

export default getRedisClient;
