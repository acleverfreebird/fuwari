<script>
import { createEventDispatcher, onDestroy, onMount } from "svelte";

// 组件属性
export let songs = [];

// 状态变量
let currentSong = null;
let audioElement = null;
let isPlaying = false;
let duration = 0;
let currentTime = 0;
let volume = 0.7;
let isVolumeVisible = false;
let timeoutId = null;
let progress = 0;
let isNeteaseMusicEmbed = false; // 标记是否为网易云音乐嵌入
let embedElement = null; // iframe元素引用

const dispatch = createEventDispatcher();

// 生命周期钩子
onMount(() => {
	audioElement = new Audio();

	// 事件监听
	audioElement.addEventListener("timeupdate", handleTimeUpdate);
	audioElement.addEventListener("ended", handleEnded);
	audioElement.addEventListener("loadedmetadata", () => {
		if (audioElement) {
			duration = audioElement.duration;
		}
	});

	// 设置初始音量
	if (audioElement) {
		audioElement.volume = volume;
	}

	// 返回清理函数
	return () => {
		if (audioElement) {
			audioElement.removeEventListener("timeupdate", handleTimeUpdate);
			audioElement.removeEventListener("ended", handleEnded);
			if (audioElement.src) {
				audioElement.pause();
			}
		}
	};
});

onDestroy(() => {
	if (timeoutId) {
		clearTimeout(timeoutId);
	}
	if (audioElement) {
		audioElement.pause();
		audioElement.src = "";
	}
});

// 处理函数
function handleTimeUpdate() {
	if (!audioElement) return;
	currentTime = audioElement.currentTime;
	progress = (currentTime / duration) * 100 || 0;
}

function handleEnded() {
	if (songs.length > 1) {
		playNext();
	} else {
		isPlaying = false;
		dispatch("playStateChange", {
			id: currentSong ? currentSong.id : null,
			isPlaying,
		});
	}
}

// 检测网易云音乐链接
function isNeteaseMusic(url) {
	return url && (url.includes("music.163.com") || url.includes("netease"));
}

function togglePlay() {
	if (!currentSong || !audioElement) return;

	if (isNeteaseMusicEmbed) {
		// 对于网易云音乐，只能切换本地状态，无法直接控制iframe
		isPlaying = !isPlaying;
		dispatch("playStateChange", { id: currentSong.id, isPlaying });
		return;
	}

	if (isPlaying) {
		audioElement.pause();
	} else {
		audioElement.play().catch((error) => {
			console.error("播放错误:", error);
		});
	}

	isPlaying = !isPlaying;
	dispatch("playStateChange", { id: currentSong.id, isPlaying });
}

function playSong(song) {
	if (!audioElement) return;

	// 如果点击的是当前歌曲，则切换播放状态
	if (currentSong && song.id === currentSong.id) {
		togglePlay();
		return;
	}

	// 停止当前播放
	if (audioElement.src) {
		audioElement.pause();
	}

	currentSong = song;

	// 检查是否为网易云音乐
	if (isNeteaseMusic(song.musicUrl)) {
		// 设置为网易云音乐嵌入模式
		isNeteaseMusicEmbed = true;
		embedElement = song.musicUrl;

		// 模拟播放状态
		isPlaying = true;
		duration =
			Number.parseFloat(song.duration.split(":")[0]) * 60 +
			Number.parseFloat(song.duration.split(":")[1] || 0);
		currentTime = 0;

		// 通知状态变化
		dispatch("playStateChange", { id: currentSong.id, isPlaying: true });
	} else {
		// 正常音频模式
		isNeteaseMusicEmbed = false;
		audioElement.src = song.musicUrl;
		audioElement.load();
		audioElement
			.play()
			.then(() => {
				isPlaying = true;
				if (currentSong) {
					dispatch("playStateChange", { id: currentSong.id, isPlaying });
				}
			})
			.catch((error) => {
				console.error("播放错误:", error);
				isPlaying = false;
			});
	}
}

function playNext() {
	if (!currentSong || songs.length === 0) return;

	const currentIndex = songs.findIndex((song) => song.id === currentSong.id);
	const nextIndex = (currentIndex + 1) % songs.length;
	playSong(songs[nextIndex]);
}

function playPrevious() {
	if (!currentSong || songs.length === 0) return;

	const currentIndex = songs.findIndex((song) => song.id === currentSong.id);
	const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
	playSong(songs[prevIndex]);
}

function setProgress(e) {
	if (!audioElement || !duration || isNeteaseMusicEmbed) return;

	const progressBar = e.currentTarget;
	const rect = progressBar.getBoundingClientRect();
	const percent = (e.clientX - rect.left) / rect.width;
	audioElement.currentTime = percent * duration;
}

function setVolume(e) {
	if (!audioElement) return;

	const volumeBar = e.currentTarget;
	const rect = volumeBar.getBoundingClientRect();
	const newVolume = (e.clientX - rect.left) / rect.width;

	volume = Math.max(0, Math.min(1, newVolume));
	audioElement.volume = volume;
}

function showVolumeControl() {
	isVolumeVisible = true;
	if (timeoutId) clearTimeout(timeoutId);

	timeoutId = setTimeout(() => {
		isVolumeVisible = false;
	}, 3000);
}

// 导出方法供外部组件调用
export function playById(id) {
	const song = songs.find((song) => song.id === id);
	if (song) playSong(song);
}

export function isCurrentSong(id) {
	return currentSong ? currentSong.id === id : false;
}

export function getCurrentPlayState() {
	return {
		id: currentSong ? currentSong.id : null,
		isPlaying,
	};
}

function formatTime(seconds) {
	if (Number.isNaN(seconds)) return "0:00";

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
</script>

{#if currentSong}
  <!-- 网易云音乐嵌入模式 -->
  {#if isNeteaseMusicEmbed}
    <div class="music-player fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 md:p-3 z-50 transition-transform duration-300">
      <div class="container mx-auto flex flex-col">
        <!-- 网易云音乐播放器嵌入 -->
        <div class="netease-player-container w-full flex justify-center my-1">
          <iframe 
            title="网易云音乐播放器" 
            frameborder="0" 
            class="w-full max-w-3xl h-20" 
            allow="autoplay; encrypted-media" 
            src={embedElement}
          ></iframe>
        </div>
        
        <!-- 显示当前歌曲信息 -->
        <div class="player-controls flex items-center justify-between mt-2">
          <div class="flex items-center space-x-3 md:space-x-4">
            <img 
              src={currentSong.coverUrl} 
              alt={currentSong.title} 
              class="h-10 w-10 md:h-12 md:w-12 rounded-md object-cover"
            />
            <div class="flex flex-col">
              <span class="font-medium text-sm md:text-base line-clamp-1">{currentSong.title}</span>
              <span class="text-xs md:text-sm text-muted-foreground line-clamp-1">{currentSong.artist}</span>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <span class="text-xs text-muted-foreground">网易云音乐外链播放</span>
            <button class="p-1 md:p-2 text-muted-foreground hover:text-foreground" on:click={playNext}>下一曲</button>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- 标准音频播放器模式 -->
    <div class="music-player fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 md:p-3 z-50 transition-transform duration-300">
      <div class="container mx-auto flex flex-col">
        <div class="progress-bar h-1 bg-muted cursor-pointer mb-2" on:click={setProgress}>
          <div class="progress h-full bg-primary" style="width: {progress}%"></div>
        </div>
        
        <div class="player-controls flex items-center justify-between">
          <div class="flex items-center space-x-3 md:space-x-4">
            <img 
              src={currentSong.coverUrl} 
              alt={currentSong.title} 
              class="h-10 w-10 md:h-12 md:w-12 rounded-md object-cover"
            />
            <div class="flex flex-col">
              <span class="font-medium text-sm md:text-base line-clamp-1">{currentSong.title}</span>
              <span class="text-xs md:text-sm text-muted-foreground line-clamp-1">{currentSong.artist}</span>
            </div>
          </div>
          
          <div class="player-buttons flex items-center space-x-2 md:space-x-4">
            <button class="p-1 md:p-2 text-muted-foreground hover:text-foreground" on:click={playPrevious}>上一曲</button>
            
            <button class="p-2 rounded-full bg-primary text-primary-foreground" on:click={togglePlay}>
              {#if isPlaying}
              暂停
              {:else}
              播放
              {/if}
            </button>
            
            <button class="p-1 md:p-2 text-muted-foreground hover:text-foreground" on:click={playNext}>下一曲</button>
          </div>
          
          <div class="flex items-center space-x-2 relative">
            <div class="text-xs text-muted-foreground hidden sm:block">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            
            <div class="relative" on:mouseenter={showVolumeControl}>
              <button class="p-1 text-muted-foreground hover:text-foreground">音量</button>
              
              {#if isVolumeVisible}
              <div class="absolute bottom-full right-0 p-2 bg-card rounded-md shadow-lg mb-2" on:mouseleave={() => isVolumeVisible = false}>
                <div class="volume-bar w-24 h-2 bg-muted rounded-full cursor-pointer" on:click={setVolume}>
                  <div class="volume-level h-full bg-primary rounded-full" style="width: {volume * 100}%"></div>
                </div>
              </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .music-player {
    backdrop-filter: blur(10px);
  }
  
  .progress-bar {
    border-radius: 4px;
    overflow: hidden;
  }
  
  .volume-bar {
    overflow: hidden;
  }
</style>