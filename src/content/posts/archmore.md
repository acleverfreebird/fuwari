---
title: 'ArchLinux 桌面环境安装配置教程'
published: 2025-08-15
description: 'ArchLinux桌面环境完整配置教程：详细讲解KDE Plasma桌面安装、SDDM显示管理器配置、Fcitx5中文输入法设置、Timeshift系统备份、用户权限管理、archlinuxcn源配置、常用软件安装等内容，将Arch打造成功能完善的日常使用系统，适合Linux桌面用户。'
image: ''
tags: ['ArchLinux', 'KDE Plasma', 'Fcitx5', 'Linux桌面', '系统配置']
category: 'Linux'
draft: false
lang: 'zh-CN'
excerpt: 'ArchLinux 基础安装后的关键步骤：安装 KDE Plasma 桌面环境、配置用户权限、中文输入法和系统优化，让你的 Arch Linux 成为真正可用的日常操作系统。'
keywords: ['ArchLinux桌面', 'KDE Plasma', 'Fcitx5输入法', 'SDDM', 'Timeshift备份', 'Linux桌面配置']
readingTime: 20
series: 'ArchLinux安装系列'
seriesOrder: 2
---
> 欢迎来到 Arch Linux 安装系列的关键一步！虽然基础系统安装完成后已经可以运行，但没有图形界面的操作系统显然不适合日常使用。本教程将指导你完成桌面环境和常用应用的安装配置，让你的 Arch Linux 成为真正可用的日常操作系统。

## 准备工作

在开始之前，请确保你已经完成了 Arch Linux 的基础安装，并且能够通过命令行登录系统。本教程将以 KDE Plasma 桌面环境为例进行讲解，这是一个功能丰富且适合新手的选择。

## 详细步骤

### 0. 确保系统为最新

如果你的系统已经有一段时间没有更新，首先需要更新系统到最新状态：

```bash
pacman -Syu  # 升级系统中全部包
```

![update](https://arch.icekylin.online/assets/desktop-env-and-app_update.hLcbqWdh.png)

### 1. 配置 root 账户的默认编辑器

默认情况下，Arch Linux 在一些终端编辑场景会调用 `vi` 编辑器，但我们推荐使用 `vim`。通过以下命令配置默认编辑器：

```bash
vim ~/.bash_profile
```

在适当位置加入以下内容：

```bash
export EDITOR='vim'
```

保存并退出 vim。

### 2. 准备非 root 用户

为了系统安全，我们不应该直接使用 root 用户进行日常操作。通过以下命令创建一个新用户（将 `myusername` 替换为你的用户名）：

```bash
useradd -m -G wheel -s /bin/bash myusername
```

**命令参数说明**：
- `-m`: 创建用户的同时创建用户家目录
- `-G`: 指定附加组
- `wheel`: 该附加组允许用户通过 sudo 提权
- `-s`: 指定默认 shell 程序

设置新用户密码：

```bash
passwd myusername
```

![add-user](https://arch.icekylin.online/assets/desktop-env-and-app_add-user.DgpktZvJ.png)

接下来配置 sudo 权限，使用以下命令编辑 sudoers 文件：

```bash
EDITOR=vim visudo
```

找到如下一行，去掉前面的注释符号 `#`：

```ini
#%wheel ALL=(ALL:ALL) ALL
```

![visudo](https://arch.icekylin.online/assets/desktop-env-and-app_visudo.CeiBPPKk.png)

保存并退出 vim 编辑器。

### 3. 开启 32 位支持库与 Arch Linux 中文社区仓库

编辑 pacman 配置文件：

```bash
vim /etc/pacman.conf
```

去掉 `[multilib]` 一节中两行的注释，开启 32 位库支持：

![multilib](https://arch.icekylin.online/assets/desktop-env-and-app_multilib.CgYpVyzx.png)

在文档结尾处加入下面的文字，添加 archlinuxcn 源：

```ini
[archlinuxcn]
Server = https://mirrors.ustc.edu.cn/archlinuxcn/$arch  # 中国科学技术大学开源镜像站
# Server = https://mirrors.tuna.tsinghua.edu.cn/archlinuxcn/$arch  # 清华大学开源软件镜像站
# Server = https://mirrors.hit.edu.cn/archlinuxcn/$arch  # 哈尔滨工业大学开源镜像站
# Server = https://repo.huaweicloud.com/archlinuxcn/$arch  # 华为开源镜像站
```

![archlinuxcn](https://arch.icekylin.online/assets/desktop-env-and-app_archlinuxcn.BeT2LYgT.png)

保存并退出后，刷新 pacman 数据库并更新系统：

```bash
pacman -Syyu
```

![syyu](https://arch.icekylin.online/assets/desktop-env-and-app_syyu.D2ap2NSy.png)

### 4. 安装 KDE Plasma 桌面环境

对于新手，我们推荐安装 KDE Plasma 桌面环境。执行以下命令安装相关软件包：

```bash
pacman -S plasma-meta konsole dolphin  # plasma-meta 元软件包、konsole 终端模拟器和 dolphin 文件管理器
```

![install-kde](https://arch.icekylin.online/assets/desktop-env-and-app_install-kde.DDoiXid5.png)

如果你想使用 Wayland 而非默认的 Xorg，可以额外安装：

```bash
pacman -S plasma-workspace xdg-desktop-portal
# N卡用户需要额外安装egl-wayland
# kde用户可选择安装xdg-desktop-portal-kde包
```

### 5. 配置并启动显示管理器 sddm

安装完成后，需要启用并启动 sddm 显示管理器：

```bash
systemctl enable sddm  # 设置开机自启
systemctl start sddm   # 立即启动显示管理器，或使用 reboot 命令重启电脑
```

![sign-in](https://arch.icekylin.online/assets/desktop-env-and-app_sign-in.CFfySfXc.png)

输入之前创建的新用户密码并回车，即可登录桌面环境：

![desktop](https://arch.icekylin.online/assets/desktop-env-and-app_desktop.b_j8eMIz.png)

![enable-sddm](https://arch.icekylin.online/assets/desktop-env-and-app_sddm.COX1Eq5h.png)

### 6. 安装基础功能包

进入桌面后，首先打开 Konsole 终端：

![konsole](https://arch.icekylin.online/assets/desktop-env-and-app_konsole.CrtrMBU-.png)

测试网络连通性：

```bash
ping www.bilibili.com  # 测试网络连通性
```

安装一些基础功能包：

```bash
sudo pacman -S sof-firmware alsa-firmware alsa-ucm-conf  # 声音固件
sudo pacman -S ntfs-3g  # 支持 NTFS 格式硬盘
sudo pacman -S adobe-source-han-serif-cn-fonts wqy-zenhei  # 开源中文字体
sudo pacman -S noto-fonts noto-fonts-cjk noto-fonts-emoji noto-fonts-extra  # 谷歌开源字体及表情
sudo pacman -S firefox chromium  # 网页浏览器
sudo pacman -S ark  # 压缩软件
sudo pacman -S packagekit-qt6 packagekit appstream-qt appstream  # 确保 Discover 软件中心可用
sudo pacman -S gwenview  # 图片查看器
sudo pacman -S steam  # 游戏商店（建议先安装显卡驱动）
```

安装 archlinuxcn 源所需的相关包：

```bash
sudo pacman -S archlinuxcn-keyring  # cn 源中的签名
sudo pacman -S yay  # AUR 助手
```

> **提示**：若安装 archlinuxcn-keyring 时报错，可先按照 [archlinuxcn 官方说明](https://www.archlinuxcn.org/archlinuxcn-keyring-manually-trust-farseerfc-key/) 执行修复命令。

### 7. 检查家目录

检查家目录下的常见目录是否已创建，若没有则手动创建：

```bash
cd ~
ls -hl
xdg-user-dirs-update
```

![mkdir](https://arch.icekylin.online/assets/desktop-env-and-app_mkdir.CHXIdif8.png)

### 8. 配置非 root 账户的默认编辑器

编辑 bashrc 文件：

```bash
vim ~/.bashrc
```

在适当位置加入以下内容：

```bash
export EDITOR='vim'
```

保存并退出。

### 9. 设置系统为中文

打开系统设置 > 语言和区域设置 > 在语言中点击"添加语言..." > 选择中文并添加，然后拖拽到第一位 > 点击"应用"。

![language](https://arch.icekylin.online/assets/desktop-env-and-app_language.BQgmp6RE.png)

注销并重新登录后生效：

![language-effect](https://arch.icekylin.online/assets/desktop-env-and-app_effect.DUiUok3A.png)

> **注意**：很多人会错误地更改"区域设置" > "格式"中的值为中文蒙古或其他值，这会导致系统中英文混杂。这里的值应保持默认的 en_US 或 zh_CN。

### 10. 安装输入法

安装 Fcitx5 输入法相关软件包：

```bash
sudo pacman -S fcitx5-im  # 输入法基础包组
sudo pacman -S fcitx5-chinese-addons  # 官方中文输入引擎
sudo pacman -S fcitx5-anthy  # 日文输入引擎（可选）
sudo pacman -S fcitx5-pinyin-moegirl  # 萌娘百科词库（archlinuxcn）
sudo pacman -S fcitx5-material-color  # 输入法主题
```

设置环境变量，创建并编辑文件：

```bash
vim ~/.config/environment.d/im.conf
```

加入以下内容：

```properties
# fix fcitx problem
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
SDL_IM_MODULE=fcitx
GLFW_IM_MODULE=ibus
```

![fcitx5_step-1](https://arch.icekylin.online/assets/desktop-env-and-app_fcitx5-1.CWPUKgzZ.png)

打开"系统设置" > "区域设置" > "输入法"，点击提示信息中的"运行 Fcitx"：

![fcitx5_step-2](https://arch.icekylin.online/assets/desktop-env-and-app_fcitx5-2.DsutD0Gj.png)

点击"添加输入法" > 找到简体中文下的"Pinyin" > 点击"添加"：

![fcitx5_step-3](https://arch.icekylin.online/assets/desktop-env-and-app_fcitx5-3.DhS-DLTB.png)

点击 Pinyin 右侧的配置按钮 > 点选"云拼音"和"在程序中显示预编辑文本" > 点击"应用"：

![fcitx5_step-4](https://arch.icekylin.online/assets/desktop-env-and-app_fcitx5-4.jCPM0tUR.png)

回到输入法设置 > 点击"配置附加组件" > 找到"Classic User Interface" > 在主题里选择喜欢的颜色 > 点击"应用"：

![fcitx5_step-5](https://arch.icekylin.online/assets/desktop-env-and-app_fcitx5-5.Bl6PqI9c.png)

注销并重新登录，现在你应该可以在各个软件中输入中文了：

![fcitx5_step-6](https://arch.icekylin.online/assets/desktop-env-and-app_fcitx5-6.Dl7PclS5.png)

> **提示**：通过 Ctrl + 空格 切换中英文输入。

### 11. 启动蓝牙（若有）

开启蓝牙服务并设置开机自动启动：

```bash
sudo systemctl enable --now bluetooth
```

### 12. 设置 Timeshift 快照

安装 Timeshift：

```bash
sudo pacman -S timeshift
```

![timeshift-install](https://arch.icekylin.online/assets/desktop-env-and-app_timeshift-install.CFm_Buvh.png)

确保 cronie 服务已启动：

```bash
sudo systemctl enable --now cronie.service
```

打开 Timeshift，第一次启动会自动启动设置向导。

#### 12-1. 若使用 Btrfs 文件系统

快照类型选择"BTRFS"，点击"下一步"：

![timeshift-config_step-1](https://arch.icekylin.online/assets/desktop-env-and-app_timeshift-cfg-1.DoRzxzdz.png)

快照位置选择 BTRFS 分区，点击"下一步"：

![timeshift-config_step-2](https://arch.icekylin.online/assets/desktop-env-and-app_timeshift-cfg-2.DGFWpvat.png)

选择快照计划，点击"下一步"：

![timeshift-config_step-3](https://arch.icekylin.online/assets/desktop-env-and-app_timeshift-cfg-3.D2SqXcfA.png)

选择是否包含 @home 子卷，点击"下一步"：

![timeshift-config_step-4](https://arch.icekylin.online/assets/desktop-env-and-app_timeshift-cfg-4.DZV4QEAT.png)

点击"完成"结束配置。

> **注意**：完成后建议执行以下命令删除 subvolid：
> ```bash
> sudo sed -i -E 's/(subvolid=[0-9]+,)|(,subvolid=[0-9]+)//g' /etc/fstab
> ```

#### 12-2. 若使用 ext4 文件系统

快照类型选择"RSYNC"，点击"下一步"，然后按照向导完成配置。

### 13. 自动生成快照启动项

安装 grub-btrfs 包：

```bash
sudo systemctl enable --now grub-btrfsd.service
```

修改服务配置：

```bash
sudo systemctl edit grub-btrfsd.service
```

添加以下内容：

```
[Service]
ExecStart=
ExecStart=/usr/bin/grub-btrfsd --syslog --timeshift-auto
```

重载并重启服务：

```bash
sudo systemctl daemon-reload
sudo systemctl restart grub-btrfsd.service
```

## 总结

恭喜！你已经成功安装并配置了 Arch Linux 桌面环境和常用应用。现在你拥有了一个功能完善的 Arch Linux 系统，可以作为日常使用的主力系统。

接下来，你可能需要配置显卡驱动和透明代理，这些将进一步提升你的系统体验。KDE 桌面环境功能丰富，建议花一些时间探索其设置，打造属于你自己的个性化工作环境。

祝你使用 Arch Linux 愉快！