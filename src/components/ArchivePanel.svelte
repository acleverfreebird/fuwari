<script lang="ts">
import { onMount, tick } from "svelte";

import I18nKey from "../i18n/i18nKey";
import { i18n } from "../i18n/translation";
import { getPostUrlBySlug } from "../utils/url-utils";

export let tags: string[];
export let categories: string[];
export let sortedPosts: Post[] = [];

const params = new URLSearchParams(window.location.search);
tags = params.has("tag") ? params.getAll("tag") : [];
categories = params.has("category") ? params.getAll("category") : [];
const uncategorized = params.get("uncategorized");

interface Post {
	slug: string;
	data: {
		title: string;
		tags: string[];
		category?: string;
		published: Date;
	};
}

interface Group {
	year: number;
	posts: Post[];
}

let groups: Group[] = [];
let isLoading = true;
let visibleGroups: Group[] = [];
let containerElement: HTMLElement;
let observer: IntersectionObserver;

function formatDate(date: Date) {
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${month}-${day}`;
}

function formatTag(tagList: string[]) {
	return tagList.map((t) => `#${t}`).join(" ");
}

onMount(() => {
	// 使用 requestAnimationFrame 优化初始渲染
	requestAnimationFrame(async () => {
		let filteredPosts: Post[] = sortedPosts;

		if (tags.length > 0) {
			filteredPosts = filteredPosts.filter(
				(post) =>
					Array.isArray(post.data.tags) &&
					post.data.tags.some((tag) => tags.includes(tag)),
			);
		}

		if (categories.length > 0) {
			filteredPosts = filteredPosts.filter(
				(post) => post.data.category && categories.includes(post.data.category),
			);
		}

		if (uncategorized) {
			filteredPosts = filteredPosts.filter((post) => !post.data.category);
		}

		const grouped = filteredPosts.reduce(
			(acc, post) => {
				const year = post.data.published.getFullYear();
				if (!acc[year]) {
					acc[year] = [];
				}
				acc[year].push(post);
				return acc;
			},
			{} as Record<number, Post[]>,
		);

		const groupedPostsArray = Object.keys(grouped).map((yearStr) => ({
			year: Number.parseInt(yearStr, 10),
			posts: grouped[Number.parseInt(yearStr, 10)],
		}));

		groupedPostsArray.sort((a, b) => b.year - a.year);

		groups = groupedPostsArray;

		// 初始只显示前3个年份组，其余延迟加载
		visibleGroups = groups.slice(0, 3);

		await tick();
		isLoading = false;

		// 设置 Intersection Observer 用于懒加载剩余内容
		if (groups.length > 3) {
			setupLazyLoading();
		}
	});

	return () => {
		if (observer) {
			observer.disconnect();
		}
	};
});

function setupLazyLoading() {
	observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && visibleGroups.length < groups.length) {
					// 每次加载2个年份组
					const nextBatch = groups.slice(
						visibleGroups.length,
						visibleGroups.length + 2,
					);
					visibleGroups = [...visibleGroups, ...nextBatch];
				}
			});
		},
		{
			rootMargin: "200px", // 提前200px开始加载
			threshold: 0.1,
		},
	);

	// 观察容器底部
	if (containerElement) {
		observer.observe(containerElement);
	}
}
</script>

<div class="card-base px-8 py-6" bind:this={containerElement}>
    {#if isLoading}
        <!-- 骨架屏 -->
        <div class="space-y-6 animate-pulse">
            {#each Array(3) as _, i}
                <div>
                    <div class="flex flex-row w-full items-center h-[3.75rem]">
                        <div class="w-[15%] md:w-[10%]">
                            <div class="h-8 bg-gray-300 dark:bg-gray-700 rounded w-16 ml-auto"></div>
                        </div>
                        <div class="w-[15%] md:w-[10%]">
                            <div class="h-3 w-3 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto"></div>
                        </div>
                        <div class="w-[70%] md:w-[80%]">
                            <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    </div>
                    {#each Array(5) as _, j}
                        <div class="flex flex-row justify-start items-center h-10">
                            <div class="w-[15%] md:w-[10%]">
                                <div class="h-3 bg-gray-200 dark:bg-gray-600 rounded w-12 ml-auto"></div>
                            </div>
                            <div class="w-[15%] md:w-[10%]">
                                <div class="h-1 w-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto"></div>
                            </div>
                            <div class="w-[70%] md:w-[65%]">
                                <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
    {:else}
        {#each visibleGroups as group}
        <div>
            <div class="flex flex-row w-full items-center h-[3.75rem]">
                <div class="w-[15%] md:w-[10%] transition text-2xl font-bold text-right text-75">
                    {group.year}
                </div>
                <div class="w-[15%] md:w-[10%]">
                    <div
                            class="h-3 w-3 bg-none rounded-full outline outline-[var(--primary)] mx-auto
                  -outline-offset-[2px] z-50 outline-3"
                    ></div>
                </div>
                <div class="w-[70%] md:w-[80%] transition text-left text-50">
                    {group.posts.length} {i18n(group.posts.length === 1 ? I18nKey.postCount : I18nKey.postsCount)}
                </div>
            </div>

            {#each group.posts as post}
                <a
                        href={getPostUrlBySlug(post.slug)}
                        aria-label={post.data.title}
                        class="group btn-plain !block h-10 w-full rounded-lg hover:text-[initial]"
                >
                    <div class="flex flex-row justify-start items-center h-full">
                        <!-- date -->
                        <div class="w-[15%] md:w-[10%] transition text-sm text-right text-50">
                            {formatDate(post.data.published)}
                        </div>

                        <!-- dot and line -->
                        <div class="w-[15%] md:w-[10%] relative dash-line h-full flex items-center">
                            <div
                                    class="transition-all mx-auto w-1 h-1 rounded group-hover:h-5
                       bg-[oklch(0.5_0.05_var(--hue))] group-hover:bg-[var(--primary)]
                       outline outline-4 z-50
                       outline-[var(--card-bg)]
                       group-hover:outline-[var(--btn-plain-bg-hover)]
                       group-active:outline-[var(--btn-plain-bg-active)]"
                            ></div>
                        </div>

                        <!-- post title -->
                        <div
                                class="w-[70%] md:max-w-[65%] md:w-[65%] text-left font-bold
                     group-hover:translate-x-1 transition-all group-hover:text-[var(--primary)]
                     text-75 pr-8 whitespace-nowrap overflow-ellipsis overflow-hidden"
                        >
                            {post.data.title}
                        </div>

                        <!-- tag list -->
                        <div
                                class="hidden md:block md:w-[15%] text-left text-sm transition
                     whitespace-nowrap overflow-ellipsis overflow-hidden text-30"
                        >
                            {formatTag(post.data.tags)}
                        </div>
                    </div>
                </a>
            {/each}
        </div>
        {/each}
        
        <!-- 加载指示器 -->
        {#if visibleGroups.length < groups.length}
            <div class="flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
            </div>
        {/if}
    {/if}
</div>

<style>
    /* 优化动画性能 */
    .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
    
    .animate-spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
