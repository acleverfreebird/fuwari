import type { Config, Context } from "@netlify/functions";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { slug } = await req.json();

  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  try {
    const views = await redis.incr(`views:${slug}`);
    return new Response(JSON.stringify({ views }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating views:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

export const config: Config = {
  path: "/api/views",
  method: ["POST"],
};