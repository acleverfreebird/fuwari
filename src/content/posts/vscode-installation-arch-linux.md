---
title: Arch Linux 上安装和配置 Visual Studio Code 完全指南
published: 2025-08-24
description: 'Arch Linux安装配置Visual Studio Code完全指南：详细对比Code-OSS、官方版和VSCodium三个版本的特点差异，讲解安装方法、主题插件配置、扩展市场设置、权限管理、中文语言包安装等实用技巧，帮助Linux用户完美配置开发环境。'
image: ''
tags: ['ArchLinux', 'VSCode', 'Code-OSS', 'VSCodium', '开发环境']
category: '技术教程'
draft: false
lang: 'zh-CN'
---

Visual Studio Code 是由微软开发的跨平台文本编辑器，基于 Electron 框架构建，具有强大的扩展性。在 Arch Linux 系统上，我们有多个版本可供选择，每个版本都有其特定的用途和许可证。

## VSCode 版本介绍

在 Arch Linux 上，Visual Studio Code 主要有三个版本：

### 1. Code - OSS（官方推荐）
- **包名**：[`code`](https://archlinux.org/packages/extra/x86_64/code/)
- **特点**：Arch Linux 官方开源版本，配置有 [Open VSX](https://open-vsx.org/) 市场
- **许可证**：MIT 许可证
- **扩展市场**：Open VSX Registry（扩展相对较少）

### 2. Visual Studio Code（微软官方版）
- **包名**：[`visual-studio-code-bin`](https://aur.archlinux.org/packages/visual-studio-code-bin)（AUR）
- **特点**：微软官方专有版本
- **许可证**：专有许可证
- **扩展市场**：官方 Visual Studio Marketplace（扩展最全）

### 3. VSCodium（社区版）
- **包名**：[`vscodium`](https://aur.archlinux.org/packages/vscodium)（AUR）
- **特点**：社区驱动的完全开源版本，去除了微软遥测功能
- **许可证**：MIT 许可证
- **扩展市场**：Open VSX Registry

## 安装方法

### 方法一：安装 Code - OSS（推荐新手）

```bash
sudo pacman -S code
```

这是最简单的安装方式，直接从官方仓库安装。

### 方法二：安装微软官方版本

```bash
# 安装 yay（如果未安装）
sudo pacman -S yay

# 安装 VSCode 官方版本
yay -S visual-studio-code-bin
```

### 方法三：安装 VSCodium

```bash
yay -S vscodium
```

## 启动应用程序

根据安装的版本不同，启动命令也不同：

- **Code - OSS**：`code` 或 `code --no-sandbox`
- **Visual Studio Code**：`code`
- **VSCodium**：`codium`

如果需要打开多个实例，可以使用 `-n` 选项：

```bash
code -n
```

## 重要：主题插件权限配置

⚠️ **特别注意**：当你安装任何会修改 VSCode 主题的插件时，可能会遇到权限问题。此时需要执行以下命令来赋予适当的权限：

```bash
sudo chown -R $(whoami) /usr/lib/code
```

这个命令将 `/usr/lib/code` 目录的所有权更改为当前用户，解决主题插件无法正常工作的问题。

如果你使用的是微软官方版本，路径可能会有所不同。可以通过以下命令找到正确的安装路径：

```bash
which code
```

## 扩展市场配置

### 问题说明
由于许可证限制，开源版本（Code - OSS 和 VSCodium）默认无法访问微软官方扩展市场，只能使用功能相对有限的 Open VSX Registry。

### 解决方案
如果你需要使用官方扩展市场，可以安装对应的市场包：

- 对于 Code - OSS：`yay -S code-marketplace`
- 对于 VSCodium：`yay -S vscodium-marketplace`

这些包包含 pacman 钩子，会在每次更新后自动更新 `product.json` 文件。

## 基本配置

### 配置文件位置

不同版本的配置文件位置：

- **Code - OSS**：
  - 配置：`~/.config/Code - OSS/User/settings.json`
  - 扩展：`~/.vscode-oss`

- **Visual Studio Code**：
  - 配置：`~/.config/Code/User/settings.json`
  - 扩展：`~/.vscode`

- **VSCodium**：
  - 配置：`~/.config/VSCodium/User/settings.json`
  - 扩展：`~/.vscode-oss`

### 集成终端配置

默认情况下，VSCode 使用 Bash 作为集成终端。你可以通过修改配置文件来更改默认终端：

```json
{
  "terminal.integrated.shell.linux": "/usr/bin/fish",
  "terminal.integrated.shellArgs.linux": ["-l", "-d 3"]
}
```

### Wayland 支持

如果你在 Wayland 桌面环境下使用，可以通过创建配置文件来启用原生 Wayland 支持：

**对于 Visual Studio Code 和 Code - OSS**：
```bash
echo "--enable-features=UseOzonePlatform --ozone-platform=wayland" > ~/.config/code-flags.conf
```

**对于 VSCodium**：
```bash
echo "--enable-features=UseOzonePlatform --ozone-platform=wayland" > ~/.config/codium-flags.conf
```

## 常见问题解决

### 1. 无法将文件移至回收站
设置环境变量来指定删除文件的方式：

```bash
export ELECTRON_TRASH=trash-cli
code
```

### 2. KDE 全局菜单失效
安装 `libdbusmenu-glib` 包：

```bash
sudo pacman -S libdbusmenu-glib
```

### 3. 找不到密钥环
在某些桌面环境（如 i3）中，需要手动指定密钥环。编辑 `argv.json` 文件：

```json
{
  "password-store": "gnome-libsecret"
}
```

### 4. 字体模糊问题（HiDPI）
如果在高分辨率屏幕上遇到字体模糊问题，可以手动指定缩放比例：

```bash
code --force-device-scale-factor=2
```

## 推荐配置

### 基本设置示例

```json
{
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.formatOnSave": true,
  "files.autoSave": "onDelay",
  "terminal.integrated.shell.linux": "/bin/zsh",
  "workbench.colorTheme": "Dark+ (default dark)"
}
```

## 总结

在 Arch Linux 上安装 VSCode 有多种选择：

1. **新手推荐**：直接安装 `code` 包，简单快捷
2. **专业开发**：安装 `visual-studio-code-bin`，获得完整功能
3. **隐私优先**：选择 `vscodium`，无微软遥测

记住，无论选择哪个版本，当安装主题相关插件时，都要执行权限修复命令：

```bash
sudo chown -R $(whoami) /usr/lib/code
```

这将确保你的 VSCode 能够正常工作并充分利用其强大的扩展生态系统。