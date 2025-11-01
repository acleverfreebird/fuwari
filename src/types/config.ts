import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";

export type SiteConfig = {
	title: string;
	subtitle: string;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	themeColor: {
		hue: number;
		fixed: boolean;
	};
	banner: {
		enable: boolean;
		src: string;
		position?: "top" | "center" | "bottom";
		mobilePosition?: "top" | "center" | "bottom";
		tabletPosition?: "top" | "center" | "bottom";
		credit: {
			enable: boolean;
			text: string;
			url?: string;
		};
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	favicon: Favicon[];
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export enum LinkPreset {
	Home = 0,
	Archive = 1,
	About = 2,
	Friends = 3,
	Music = 4,
	Gallery = 5,
}

export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
};

export type NavBarConfig = {
	links: (NavBarLink | LinkPreset)[];
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE =
	| typeof LIGHT_MODE
	| typeof DARK_MODE
	| typeof AUTO_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string;
	category?: string;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
};

export type MusicItem = {
	id: string;
	title: string;
	artist: string;
	album: string;
	coverUrl: string;
	musicUrl: string;
	duration: string;
	description?: string;
};

export type MusicData = {
	songs: MusicItem[];
};

export type GalleryItem = {
	id: string;
	title: string;
	description: string;
	imageUrl: string;
	tags: string[];
	date: string;
	photographer: string;
};

export type GalleryData = {
	images: GalleryItem[];
};

export type UmamiConfig = {
	enable: boolean; // 是否启用 Umami
	src: string; // Umami 脚本地址
	websiteId: string; // 网站 ID
	domains?: string; // (可选) 限制追踪的域名
	autoTrack?: boolean; // (可选) 自动追踪,默认 true
	delayLoad?: number; // (可选) 延迟加载时间(毫秒),默认 2000
};
