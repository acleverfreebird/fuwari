import type { MusicItem } from "@/types/config";

/**
 * 解析网易云音乐外链URL，提取音乐ID
 * @param url 网易云音乐外链URL
 * @returns 音乐ID或null
 */
export function parseNeteaseMusicUrl(url: string): string | null {
	try {
		const urlObj = new URL(url);
		// 检查是否是网易云音乐链接
		if (!urlObj.hostname.includes("music.163.com")) {
			return null;
		}

		// 从查询参数中提取ID
		const id = urlObj.searchParams.get("id");
		return id;
	} catch (error) {
		console.error("解析网易云音乐链接失败:", error);
		return null;
	}
}

/**
 * 从网易云音乐ID创建MusicItem对象
 * @param id 网易云音乐ID
 * @param title 歌曲标题
 * @param artist 艺术家
 * @param additionalInfo 可选的其他信息
 * @returns MusicItem对象
 */
export function createNeteaseMusicItem(
	id: string,
	title: string,
	artist: string,
	additionalInfo: Partial<MusicItem> = {},
): MusicItem {
	// 生成唯一ID，使用netease-前缀加上网易云音乐ID
	const musicId = `netease-${id}`;

	// 默认封面URL
	const defaultCoverUrl = `https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/${id}.jpg`;

	// 构建网易云音乐的外链播放地址
	let musicUrl = "";

	// 创建两种可能的URL格式
	// const apiUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
	const embedUrl = `https://music.163.com/outchain/player?type=2&id=${id}&auto=0&height=66`;

	// 优先使用嵌入式播放器URL
	musicUrl = embedUrl;

	// 创建并返回MusicItem对象
	return {
		id: musicId,
		title: title,
		artist: artist,
		album: additionalInfo.album || "未知专辑",
		coverUrl: additionalInfo.coverUrl || defaultCoverUrl,
		musicUrl: additionalInfo.musicUrl || musicUrl,
		duration: additionalInfo.duration || "3:30", // 默认时长
		description: additionalInfo.description || `${title} - ${artist}`,
	};
}

/**
 * 从HTML解析网易云音乐信息
 * @param html 网易云音乐外链播放器HTML
 * @returns 包含音乐信息的对象或null
 */
export function parseMusicInfoFromHtml(
	html: string,
): { id: string; title: string; artist: string } | null {
	try {
		// 提取歌曲ID
		const idMatch = html.match(/id=(\d+)/);
		const id = idMatch ? idMatch[1] : null;

		// 提取歌曲标题和艺术家
		const titleMatch = html.match(
			/<div id="title" class="title"[^>]*>([^<]+)<span class="sub">\s*-\s*([^<]+)<\/span>/,
		);

		if (id && titleMatch && titleMatch.length >= 3) {
			const title = titleMatch[1].trim();
			const artist = titleMatch[2].trim();

			return { id, title, artist };
		}

		return null;
	} catch (error) {
		console.error("解析网易云音乐HTML失败:", error);
		return null;
	}
}

/**
 * 检查音乐是否已存在于列表中
 * @param songs 现有音乐列表
 * @param id 要检查的音乐ID
 * @returns 是否已存在
 */
export function isMusicExists(songs: MusicItem[], id: string): boolean {
	return songs.some((song) => song.id === id || song.id === `netease-${id}`);
}
