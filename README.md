# 163-music

[中文文档](./README_zh.md)

A Linux desktop client for [163 Music](https://music.163.com) (NetEase Cloud Music), wrapping the official web player with native desktop integration.

> **Philosophy**: This project does **not** re-implement the player UI. It loads the official web player and enhances it with native Linux desktop features via Electron.

## Features

- 🖥️ **Web Player** — Loads `music.163.com/st/webplayer` as the full-featured player
- 🎤 **Desktop Lyrics** — Transparent, always-on-top floating window with smooth scrolling highlight
- 🎨 **Lyrics Customization** — Adjustable font size and color, lock/unlock click-through mode
- 🔔 **System Tray** — Tray icon with right-click menu (show/hide, settings, quit)
- 🎮 **MPRIS2 Integration** — Control playback via `playerctl` or any MPRIS2-compatible media controller
- ⚙️ **Settings Panel** — Slide-in panel for all configuration, instantly applied and persisted
- 💾 **Position Memory** — Remembers lyrics window position and size across sessions
- 🔄 **Auto Lyrics** — Fetches lyrics automatically without opening the lyrics panel

## Installation

### From Releases

Download the latest `.deb`, `.rpm`, or `.AppImage` from the [Releases](https://github.com/SCX-snow/163-music/releases) page.

```bash
# Debian/Ubuntu
sudo dpkg -i 163-music_*.deb

# Fedora/RHEL
sudo rpm -i 163-music_*.rpm

# Any distro (AppImage)
chmod +x 163-music-*.AppImage
./163-music-*.AppImage
```

### Build from Source

```bash
# Prerequisites
sudo apt-get install -y libdbus-1-dev libgdk-pixbuf2.0-dev librsvg2-dev

git clone https://github.com/SCX-snow/163-music.git
cd 163-music
pnpm install
pnpm release     # outputs packages to dist/
pnpm dev         # development mode
```

## Usage

| Action | Method |
|--------|--------|
| Open settings | Click ⚙ button or press `Ctrl+,` |
| Show/hide window | Left-click tray icon |
| Tray menu | Right-click tray icon |
| Desktop lyrics | Enable in settings panel |
| Lock/unlock lyrics | Toggle in settings |
| Media control | `playerctl play-pause`, `playerctl next`, etc. |

### MPRIS2 Control

```bash
playerctl metadata       # view current song info
playerctl play-pause     # toggle playback
playerctl next           # next track
playerctl previous       # previous track
```

## Configuration

Settings are persisted to `~/.config/163-music/settings.json`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `lyricsEnabled` | bool | false | Desktop lyrics window |
| `lyricsFontSize` | string | medium | small / medium / large |
| `lyricsColor` | hex | #ffffff | Lyrics text color |
| `alwaysOnTop` | bool | false | Pin main window |
| `lyricsLocked` | bool | true | Click-through mode |

## Development

```bash
pnpm dev         # development mode with hot reload
pnpm build       # production build (electron-vite)
pnpm lint        # TypeScript type checking
pnpm release     # build packages (deb/rpm/AppImage)
```

### Project Structure

```
src/
├── main/           # Main process
│   ├── index.ts    # App entry: window, debugger, IPC, lifecycle
│   ├── lyrics.ts   # LRC lyrics parser
│   ├── lyrics-window.ts  # Desktop lyrics window manager
│   ├── mpris.ts    # MPRIS2 D-Bus interface
│   └── tray.ts     # System tray
├── preload/        # Preload scripts (contextBridge)
│   ├── index.ts    # Renderer preload API
│   └── inject.ts   # Webview injection (mediaSession hook)
└── renderer/       # Renderer process
    └── index.html  # Webview + settings panel
```

## Tech Stack

- **Electron** >= 35.x
- **TypeScript** >= 5.x
- **electron-vite** >= 3.x
- **pnpm** >= 9.x
- **electron-builder** (AppImage / deb / rpm)
- **dbus-next** (MPRIS2)

## License

MIT
