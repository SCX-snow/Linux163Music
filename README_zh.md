# 163音乐

[![Build](https://github.com/SCX-snow/163-music/actions/workflows/build.yml/badge.svg)](https://github.com/SCX-snow/163-music/actions/workflows/build.yml)

[English Documentation](./README.md)

Linux 桌面端的 [163 音乐](https://music.163.com) 播放器，封装官方 Web 播放器，提供原生 Linux 桌面集成。

> **设计理念**：本项目**不重新实现播放器 UI**。只是因为官方不提供Linux版本的播放器而是只提供一个Web链接，故加载官方 Web 播放器，通过 Electron 注入脚本，为 Linux 桌面提供原生桌面集成功能。

## 功能

- **桌面歌词** — 透明置顶独立窗口，平滑滚动高亮当前行
- **系统托盘** — 托盘图标 + 右键菜单（显示/隐藏、设置、退出）
- **MPRIS2 集成** — 支持 `playerctl` 等 Linux 媒体控制器

## 安装

### 下载发布版

从 [Releases](https://github.com/SCX-snow/163-music/releases) 页面下载最新的 `.deb`、`.rpm` 或 `.AppImage`。

```bash
# Debian/Ubuntu
sudo dpkg -i 163-music_*.deb

# Fedora/RHEL
sudo rpm -i 163-music_*.rpm

# AppImage（所有发行版通用）
# Gentoo 用户需要在0槽位上安装fuse
chmod +x 163-music-*.AppImage
./163-music-*.AppImage
```

### 从源码构建

```bash
git clone https://github.com/SCX-snow/163-music.git
cd 163-music
pnpm install
pnpm release     # 输出 deb/rpm/AppImage 到 dist/
pnpm dev         # 开发模式
```

## 使用

| 操作 | 方式 |
|------|------|
| 打开设置 | 点击右上角 ⚙ 或按 `Ctrl+,` |
| 显示/隐藏主窗口 | 左键点击托盘图标 |
| 托盘右键菜单 | 右键点击托盘图标 |
| 桌面歌词 | 设置面板中开启 |
| 锁定/解锁歌词窗口 | 设置面板中切换 |
| 媒体控制 | 系统媒体控制面板 |

### MPRIS2指令 控制

```bash
playerctl metadata       # 查看当前歌曲信息
playerctl play-pause     # 播放/暂停
playerctl next           # 下一首
playerctl previous       # 上一首
```

## 配置

设置持久化在 `~/.config/163-music/settings.json`：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `lyricsEnabled` | bool | false | 桌面歌词开关 |
| `lyricsFontSize` | string | medium | 小 / 中 / 大 |
| `lyricsColor` | hex | #ffffff | 歌词颜色 |
| `alwaysOnTop` | bool | false | 主窗口置顶 |
| `lyricsLocked` | bool | true | 歌词窗口点击穿透 |

## 开发

```bash
pnpm dev         # 开发模式（热重载）
pnpm build       # 构建前端资源
pnpm lint        # TypeScript 类型检查
pnpm release     # 打包 deb/rpm/AppImage
```

### 项目结构

```
src/
├── main/           # 主进程
│   ├── index.ts    # 入口：窗口、debugger、IPC、生命周期
│   ├── lyrics.ts   # LRC 歌词解析器
│   ├── lyrics-window.ts  # 桌面歌词窗口管理
│   ├── mpris.ts    # MPRIS2 D-Bus 接口
│   └── tray.ts     # 系统托盘
├── preload/        # 预加载脚本
│   ├── index.ts    # 渲染进程 preload API
│   └── inject.ts   # webview 注入（劫持 mediaSession）
└── renderer/       # 渲染进程
    └── index.html  # webview + 设置面板
```

## 技术栈

- **Electron** >= 35.x
- **TypeScript** >= 5.x
- **electron-vite** >= 3.x
- **pnpm** >= 9.x
- **electron-builder**（AppImage / deb / rpm）
- **dbus-next**（MPRIS2）

## 许可

MIT

# 如有侵权请立刻联系删除