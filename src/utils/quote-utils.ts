/**
 * 获取每日一言
 * 从一言网API获取一条随机一言
 */
export async function getDailyQuote() {
	try {
		// 使用一言网API获取一条随机一言
		const response = await fetch("https://v1.hitokoto.cn/");

		if (!response.ok) {
			throw new Error("Failed to fetch quote from hitokoto API");
		}

		const data = await response.json();

		// 处理API返回的数据
		return {
			content: data.hitokoto,
			// 如果from_who存在则使用，否则使用from作为来源
			author: data.from_who || data.from,
		};
	} catch (error) {
		console.error("Error fetching daily quote:", error);
		return {
			content: "每日一言加载失败",
			author: "系统",
		};
	}
}
