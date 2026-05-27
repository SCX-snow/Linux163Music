# netease-cloud-music-linux

基于 Electron 的网易云音乐 Linux 桌面客户端，对官方 Web 播放器 (https://music.163.com) 进行原生封装。

## 项目定位

本项目**不重新实现播放器 UI**。加载官方 Web 页面，通过 Electron 注入脚本，为 Linux 桌面提供系统托盘、快捷键、桌面歌词、MPRIS2 控制等原生集成。

## 技术栈

- **Electron** >= 35.x
- **TypeScript** >= 5.x
- **electron-vite** >= 3.x（构建工具）
- **pnpm** >= 9.x
- 打包工具：**electron-builder**（AppImage / deb / rpm）

## 快速开始

```bash
pnpm install
pnpm dev
