import type { APIRoute } from "astro";
import { getTotalCounts } from "../../../utils/redis-client";

export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		const startTime = Date.now();
		console.log("[DEBUG] Starting total count calculation...");

		const { totalViews, totalReads } = await getTotalCounts();

		const totalDuration = Date.now() - startTime;
		console.log(`[DEBUG] Total API call duration: ${totalDuration}ms`);

		return new Response(JSON.stringify({ totalViews, totalReads }), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
			},
		});
	} catch (error) {
		console.error("Error fetching total views:", error);
		return new Response("Internal Server Error", { status: 500 });
	}
};
