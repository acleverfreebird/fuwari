---
title: ArchLinux 基础安装教程
published: 2025-08-14
description: 'ArchLinux完整安装教程2025：从零开始安装Arch系统的详细指南，包含UEFI启动配置、磁盘分区方案、Btrfs文件系统设置、GRUB引导安装、网络配置、系统时区设置、用户管理等完整步骤，配有详细截图说明，适合Linux新手和进阶用户参考学习。'
image: ''
tags: ['ArchLinux', 'Linux安装', 'Btrfs', 'GRUB', '系统配置']
category: 'Linux'
draft: false
lang: 'zh-CN'
---
# ArchLinux 基础安装教程

> ## 前言
>
> 开始正式安装 ArchLinux 了。本教程将详细介绍从进入安装环境到完成系统配置的全过程，适合新手参考。如果你对某些步骤不理解，可以参考原教程的"基础安装详解"部分。


## 1. 进入安装环境

从 ArchLinux 安装介质启动后，会看到如下界面，选择第一个选项并回车：

![ArchLinux 启动界面](https://arch.icekylin.online/assets/pre-virt_vb-14.pyALUo_J.png)

进入安装环境后，将看到命令行界面，准备开始执行安装命令：

![安装环境命令行](https://arch.icekylin.online/assets/pre-virt_vb-15.CqUq5u2n.png)

## 2. 禁用 reflector 服务

2020年起，ArchLinux 安装镜像中加入了 `reflector` 服务，它会自动更新软件源列表。由于网络环境特殊性，我们需要先禁用该服务：

```zsh
systemctl stop reflector.service  # 停止服务
systemctl status reflector.service  # 确认服务已停止（按q退出）
```

![禁用 reflector 服务](https://arch.icekylin.online/assets/basic-install_reflector.C82zlza7.png)

> ℹ️ **提示**：可以使用 `clear` 命令清屏，`Tab` 键自动补全命令，`rmmod pcspkr` 禁用蜂鸣器。

## 3. 确认 UEFI 模式

安装前需确认系统以 UEFI 模式启动：

```zsh
ls /sys/firmware/efi/efivars
```

![确认 UEFI 模式](https://arch.icekylin.online/assets/basic-install_check-efi.Cst0GaUE.png)

如果输出一堆文件列表，表示已在 UEFI 模式；否则需要进入 BIOS 设置启用 UEFI。

## 4. 连接网络

ArchLinux 安装必须依赖网络，根据网络环境选择以下方式：

### 4.1 有线连接
直接连接网线，DHCP 会自动获取 IP 地址，等待几秒即可。

### 4.2 无线连接
使用 `iwctl` 工具连接无线网络：

```zsh
iwctl  # 进入交互式命令行
device list  # 列出无线网卡设备名（如wlan0）
station wlan0 scan  # 扫描网络
station wlan0 get-networks  # 列出WiFi网络
station wlan0 connect 网络名称  # 连接网络（输入密码）
exit  # 退出
```

> ⚠️ **注意**：如果无线网卡无法显示，确保硬件开关已打开，可使用 `rfkill unblock wifi` 解锁。

### 4.3 测试网络连通性

```zsh
ping www.bilibili.com  # 测试网络连接
```

![测试网络连通性](https://arch.icekylin.online/assets/basic-install_ping.BDHpp9ke.png)

看到数据返回表示网络已连接，按 `Ctrl+C` 停止测试。

## 5. 更新系统时钟

```zsh
timedatectl set-ntp true  # 启用网络时间同步
timedatectl status  # 检查服务状态
```

![更新系统时钟](https://arch.icekylin.online/assets/basic-install_time.Dmuxtefc.png)

## 6. 更换国内软件仓库镜像源

编辑 `/etc/pacman.d/mirrorlist` 文件，将国内镜像源放在最前面：

```zsh
vim /etc/pacman.d/mirrorlist
```

推荐的国内镜像源：

```
Server = https://mirrors.ustc.edu.cn/archlinux/$repo/os/$arch  # 中国科学技术大学
Server = https://mirrors.tuna.tsinghua.edu.cn/archlinux/$repo/os/$arch  # 清华大学
Server = https://repo.huaweicloud.com/archlinux/$repo/os/$arch  # 华为
Server = http://mirror.lzu.edu.cn/archlinux/$repo/os/$arch  # 兰州大学
```

![修改镜像源](https://arch.icekylin.online/assets/basic-install_mirrorlist-1.DS2ha-4u.png)

> ⚠️ **警告**：不要在此步骤添加 `archlinuxcn` 源！

## 7. 分区和格式化（Btrfs 文件系统）

### 7.1 查看磁盘情况

```zsh
lsblk  # 显示当前分区情况
```

![查看磁盘分区](https://arch.icekylin.online/assets/basic-install_partition-1.Bh1Xqg5R.png)

识别要安装 ArchLinux 的磁盘（如 `/dev/sda` 或 `/dev/nvme0n1`）。

### 7.2 使用 cfdisk 分区

以 `/dev/sda` 为例：

```zsh
cfdisk /dev/sda  # 进入分区工具
```

![cfdisk 分区工具](https://arch.icekylin.online/assets/basic-install_partition-2.DLT4hhE7.png)

#### 创建 Swap 分区
1. 选中 `Free space` → 选择 `[New]` → 输入大小（建议为内存的60%）
2. 选择 `[Type]` → 选择 `Linux swap`

![创建 Swap 分区](https://arch.icekylin.online/assets/basic-install_partition-3.BjLUGd3s.png)
![设置 Swap 大小](https://arch.icekylin.online/assets/basic-install_partition-4.Dqv4NCG5.png)

#### 创建 Btrfs 分区
1. 选中剩余 `Free space` → 选择 `[New]` → 使用默认大小（剩余全部空间）
2. 保持默认类型 `Linux filesystem`

#### 写入分区表
选择 `[Write]` → 输入 `yes` 确认 → 选择 `[Quit]` 退出。

![写入分区表](https://arch.icekylin.online/assets/basic-install_partition-10.B4WDaAwE.png)

### 7.3 格式化分区

假设创建了以下分区：
- `/dev/sda2`：Swap 分区
- `/dev/sda3`：Btrfs 分区

#### 格式化 Swap 分区

```zsh
mkswap /dev/sda2  # 格式化Swap分区
```

![格式化 Swap](https://arch.icekylin.online/assets/basic-install_mkswap.CzM8dA_8.png)

#### 格式化 Btrfs 分区

```zsh
mkfs.btrfs -L myArch /dev/sda3  # 格式化Btrfs分区并命名为myArch
```

![格式化 Btrfs](https://arch.icekylin.online/assets/basic-install_mkbtrfs-1.CpWxbwoC.png)

### 7.4 创建 Btrfs 子卷

```zsh
mount -t btrfs -o compress=zstd /dev/sda3 /mnt  # 挂载Btrfs分区
btrfs subvolume create /mnt/@  # 创建根目录子卷
btrfs subvolume create /mnt/@home  # 创建用户主目录子卷
umount /mnt  # 卸载分区
```

![创建 Btrfs 子卷](https://arch.icekylin.online/assets/basic-install_mkbtrfs-3.DnVJ6tP6.png)

## 8. 挂载分区

按顺序挂载分区：

```zsh
# 挂载根目录子卷
mount -t btrfs -o subvol=/@,compress=zstd /dev/sda3 /mnt

# 创建并挂载/home目录
mkdir /mnt/home
mount -t btrfs -o subvol=/@home,compress=zstd /dev/sda3 /mnt/home

# 创建并挂载/boot目录（EFI分区）
mkdir -p /mnt/boot
mount /dev/sda1 /mnt/boot  # 假设sda1是EFI分区

# 启用Swap分区
swapon /dev/sda2
```

![挂载分区](https://arch.icekylin.online/assets/basic-install_mount-1.DSGPGhwn.png)

## 9. 安装系统基础包

使用 `pacstrap` 安装基础系统：

```zsh
# 安装基础包
pacstrap /mnt base base-devel linux linux-firmware btrfs-progs

# 安装必要工具
pacstrap /mnt networkmanager vim sudo zsh zsh-completions
```

![安装基础包](https://arch.icekylin.online/assets/basic-install_pacstrap-1.Q3dLs9X-.png)

## 10. 生成 fstab 文件

```zsh
genfstab -U /mnt > /mnt/etc/fstab  # 生成fstab文件
cat /mnt/etc/fstab  # 检查fstab文件
```

![生成 fstab](https://arch.icekylin.online/assets/basic-install_fstab.CtqAJn7q.png)

## 11. 切换到新系统

```zsh
arch-chroot /mnt  # 切换到新安装的系统
```

![chroot 到新系统](https://arch.icekylin.online/assets/basic-install_chroot.d0svrCrQ.png)

## 12. 配置系统

### 12.1 设置主机名

```zsh
vim /etc/hostname  # 编辑主机名文件，输入主机名（如myarch）
```

![设置主机名](https://arch.icekylin.online/assets/basic-install_set-name-and-timezone-1.B918CSnw.png)

编辑 `/etc/hosts`：

```zsh
vim /etc/hosts
```

添加以下内容：

```
127.0.0.1   localhost
::1         localhost
127.0.1.1   myarch.localdomain myarch
```

![配置 hosts](https://arch.icekylin.online/assets/basic-install_set-name-and-timezone-2.CLbXR1mh.png)

### 12.2 设置时区

```zsh
ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime  # 设置上海时区
hwclock --systohc  # 同步系统时间到硬件时钟
```

![设置时区](https://arch.icekylin.online/assets/basic-install_set-name-and-timezone-3.BFRWq2B4.png)

### 12.3 设置 Locale

编辑 `/etc/locale.gen`，取消以下行的注释：
- `en_US.UTF-8 UTF-8`
- `zh_CN.UTF-8 UTF-8`

```zsh
locale-gen  # 生成locale
echo 'LANG=en_US.UTF-8' > /etc/locale.conf  # 设置默认locale
```

![设置 Locale](https://arch.icekylin.online/assets/basic-install_locale-1.BesWF7lc.png)

### 12.4 设置 root 密码

```zsh
passwd root  # 设置root用户密码
```

![设置 root 密码](https://arch.icekylin.online/assets/basic-install_passwd.C4vgFnXJ.png)

## 13. 安装微码

根据 CPU 型号安装微码：

```zsh
# Intel CPU
pacman -S intel-ucode

# AMD CPU
pacman -S amd-ucode
```

## 14. 安装引导程序

安装 GRUB 引导程序：

```zsh
pacman -S grub efibootmgr os-prober  # 安装必要包
grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=ARCH  # 安装GRUB
```

![安装 GRUB](https://arch.icekylin.online/assets/basic-install_grub-1.BRcfVSlw.png)

编辑 `/etc/default/grub`，修改以下内容：
- 去掉 `GRUB_CMDLINE_LINUX_DEFAULT` 中的 `quiet`
- 将 `loglevel=3` 改为 `loglevel=5`
- 添加 `nowatchdog` 参数
- 添加 `GRUB_DISABLE_OS_PROBER=false`（双系统需要）

```zsh
grub-mkconfig -o /boot/grub/grub.cfg  # 生成GRUB配置文件
```

![生成 GRUB 配置](https://arch.icekylin.online/assets/basic-install_grub-3.1YkNI2Qy.png)

## 15. 完成安装

```zsh
exit  # 退出chroot环境
umount -R /mnt  # 卸载分区
reboot  # 重启系统
```

![完成安装](https://arch.icekylin.online/assets/basic-install_finish.BFJMMeTg.png)

重启前请拔掉安装介质，系统将从硬盘启动。

## 16. 首次登录

使用 root 用户登录系统，启动网络服务：

```zsh
systemctl enable --now NetworkManager  # 启动并设置NetworkManager开机自启
ping www.bilibili.com  # 测试网络连接
```

![首次登录](https://arch.icekylin.online/assets/basic-install_last-step-2.OQfzBdal.png)

## 结语

恭喜！你已成功安装 ArchLinux 基础系统。接下来可以安装桌面环境和常用软件，打造个性化的 Linux 工作环境。

> 📝 **注**：本教程图片和部分内容来源于 [arch.icekylin.online](https://arch.icekylin.online/guide/rookie/basic-install)，感谢原作者的详细指南。