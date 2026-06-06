import { app, BrowserWindow, ipcMain, Menu, screen, shell } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { is } from '@electron-toolkit/utils'
import { parseLrc, type LyricLine } from './lyrics'
import { LyricsWindow } from './lyrics-window'
import { createTray, destroyTray } from './tray'
import { initMpris, updateSongMetadata } from './mpris'

app.commandLine.appendSwitch('disable-webrtc')
Menu.setApplicationMenu(null)

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  console.warn('[app] 已有实例在运行，退出')
  app.quit()
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

let mainWindow: BrowserWindow | null = null

type Settings = {
  lyricsEnabled: boolean
  lyricsFontSize: 'small' | 'medium' | 'large'
  lyricsColor: string
  alwaysOnTop: boolean
  autoLaunch: boolean
  lyricsLocked: boolean
  lyricsWindowX: number
  lyricsWindowY: number
  lyricsWindowW: number
  lyricsWindowH: number
}

const defaultSettings: Settings = {
  lyricsEnabled: false,
  lyricsFontSize: 'medium',
  lyricsColor: '#ffffff',
  alwaysOnTop: false,
  autoLaunch: false,
  lyricsLocked: true,
  lyricsWindowX: -1,
  lyricsWindowY: -1,
  lyricsWindowW: 600,
  lyricsWindowH: 100
}

let settings: Settings = { ...defaultSettings }

let currentLyrics: LyricLine[] = []
let currentSongTitle = ''
let currentSongId = 0
let isQuitting = false
let webviewDevtools: Electron.Debugger | null = null
const lyricsWindow = new LyricsWindow()

const SETTINGS_DIR = join(app.getPath('userData'))
const SETTINGS_PATH = join(SETTINGS_DIR, 'settings.json')

function loadSettings(): Settings {
  try {
    const raw = readFileSync(SETTINGS_PATH, 'utf-8')
    return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    return { ...defaultSettings }
  }
}

function saveSettings(): void {
  try {
    if (!existsSync(SETTINGS_DIR)) mkdirSync(SETTINGS_DIR, { recursive: true })
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
  } catch {
    console.error('[settings] 保存设置失败')
  }
}

settings = loadSettings()

function setupDebugger(webContents: Electron.WebContents): void {
  try {
    const devtools = webContents.debugger
    devtools.attach('1.3')

    devtools.on('message', (_event, method, params) => {
      if (method === 'Network.responseReceived') {
        const url: string = params.response.url
        if (url.startsWith('https://music.163.com/weapi/') &&
            (url.includes('/v3/song/detail') || url.includes('/player/url/v1') || url.includes('lyric'))) {
          devtools.sendCommand('Network.getResponseBody', { requestId: params.requestId })
            .then((result: { body: string }) => {
              try {
                const data = JSON.parse(result.body)

                let songId: number | null = null
                if (url.includes('/v3/song/detail') && data.songs?.[0]?.id) {
                  songId = data.songs[0].id
                  currentSongTitle = data.songs[0].name || ''
                } else if (url.includes('/player/url/v1') && data.data?.[0]?.id) {
                  songId = data.data[0].id
                }
                if (songId && songId !== currentSongId) {
                  currentSongId = songId
                  fetchLyricsViaCDP(songId, devtools)
                  if (url.includes('/v3/song/detail') && data.songs?.[0]) {
                    const s = data.songs[0]
                    const title = s.name || ''
                    const artist = s.artists?.[0]?.name || ''
                    const album = s.album?.name || ''
                    const artUrl = s.album?.picUrl || ''
                    updateSongMetadata({ title, artist, album, artUrl })
                  }
                }

                const lrcText = data.lrc?.lyric || data.klyric?.lyric || ''
                if (lrcText) {
                  const parsed = parseLrc(lrcText)
                  currentLyrics = parsed.lines
                  mainWindow?.webContents.send('lyrics-updated', {
                    lines: currentLyrics,
                    title: currentSongTitle
                  })
                  lyricsWindow.setLyrics(currentLyrics)
                }
              } catch {
                console.warn('[debugger] 解析响应体失败')
              }
            })
            .catch(() => {
              console.warn('[debugger] 获取响应体失败')
            })
        }
      }
    })

    devtools.sendCommand('Network.enable')

    const posTimer = setInterval(() => {
      devtools.sendCommand('Runtime.evaluate', {
        expression: String.raw`(function(){
  var els=document.querySelectorAll(".cmd-typography");
  for(var i=0;i<els.length;i++){
    var t=(els[i].textContent||"").trim();
    if(/^\d+:\d{2}$/.test(t) && t!=="00:00"){
      var p=t.split(":");
      return parseInt(p[0])*60+parseInt(p[1]);
    }
  }
  return -1
})()`,
        returnByValue: true
      }).then((r: { result: { value: number } }) => {
        const sec = r.result?.value
        if (typeof sec === 'number' && sec > 0) {
          lyricsWindow.setPosition(sec * 1000)
        }
      }).catch(() => {
        console.warn('[debugger] 位置轮询失败')
      })
    }, 100)

    webContents.on('destroyed', () => clearInterval(posTimer))
  } catch {
    console.warn('[debugger] 附加 debugger 失败')
  }
}

let lyricPollTimer: ReturnType<typeof setInterval> | null = null

function fetchLyricsViaCDP(songId: number, devtools: Electron.Debugger): void {
  const expression = [
    'var __t = document.cookie.match(/__csrf=([^;]+)/)?.[1] || ""',
    'var __u = "https://music.163.com/api/song/lyric?id=' + songId + '&lv=-1&kv=-1&tv=-1&csrf_token=" + __t',
    'fetch(__u, {credentials:"include"})',
    '  .then(function(r){ return r.json() })',
    '  .then(function(d){ window.__lyricResult = d })',
    '  .catch(function(e){ window.__lyricResult = {error: String(e)} })'
  ].join('\n')

  devtools.sendCommand('Runtime.evaluate', {
    expression,
    returnByValue: true
  }).catch(() => {
    console.warn('[debugger] 歌词 fetch 执行失败')
  })

  if (lyricPollTimer) clearInterval(lyricPollTimer)
  let attempts = 0
  lyricPollTimer = setInterval(() => {
    attempts++
    if (attempts > 15) {
      if (lyricPollTimer) clearInterval(lyricPollTimer)
      lyricPollTimer = null
      return
    }

    devtools.sendCommand('Runtime.evaluate', {
      expression: 'window.__lyricResult',
      returnByValue: true
    }).then((res: { result: { value: unknown } }) => {
      const data = res.result?.value as Record<string, unknown> | null
      if (!data) return

      if (lyricPollTimer) clearInterval(lyricPollTimer)
      lyricPollTimer = null

      const lrcText = (data as any)?.lrc?.lyric || (data as any)?.klyric?.lyric || ''
      if (lrcText) {
        const parsed = parseLrc(lrcText)
        currentLyrics = parsed.lines
        lyricsWindow.setLyrics(currentLyrics)
      }
    }).catch(() => {
      console.warn('[debugger] 歌词轮询失败')
    })
  }, 500)
}

function createWindow(): void {
  const wa = screen.getPrimaryDisplay().workArea
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    x: Math.round(wa.x + (wa.width - 1200) / 2),
    y: Math.round(wa.y + (wa.height - 800) / 2),
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: '163音乐',
    icon: join(__dirname, '../../resources/tray-icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    lyricsWindow.destroy()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    webviewDevtools = webContents.debugger
    setTimeout(() => setupDebugger(webContents), 1000)
  })
}

ipcMain.on('open-settings', () => {
  mainWindow?.show()
  mainWindow?.webContents.send('open-settings')
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-settings', () => {
  return { ...settings }
})

ipcMain.handle('get-current-lyrics', () => {
  return { lines: currentLyrics, title: currentSongTitle }
})

ipcMain.on('drag-window-start', (event) => {
  const pos = lyricsWindow.getWindowPos()
  if (pos) event.sender.send('drag-window-pos', pos.x, pos.y)
})

ipcMain.on('drag-window-move', (_event, x: number, y: number) => {
  lyricsWindow.setWindowPos(x, y)
})

ipcMain.on('song-metadata', (_event, metadata: { title: string }) => {
  currentSongTitle = metadata.title
})

function enableLyricsWindow(): void {
  const sx = settings.lyricsWindowX > 0 ? settings.lyricsWindowX : undefined
  const sy = settings.lyricsWindowY > 0 ? settings.lyricsWindowY : undefined
  const sw = settings.lyricsWindowW || undefined
  const sh = settings.lyricsWindowH || undefined
  lyricsWindow.create(sx, sy, sw, sh)
  lyricsWindow.onMove((x, y, w, h) => {
    settings.lyricsWindowX = x; settings.lyricsWindowY = y
    settings.lyricsWindowW = w; settings.lyricsWindowH = h
    saveSettings()
  })
  if (currentLyrics.length > 0) {
    lyricsWindow.setLyrics(currentLyrics)
  }
  lyricsWindow.setLocked(settings.lyricsLocked)
  const sizeMap: Record<string, string> = { small: '16px', medium: '20px', large: '28px' }
  lyricsWindow.setStyle(sizeMap[settings.lyricsFontSize] || '20px', settings.lyricsColor)
}

function disableLyricsWindow(): void {
  lyricsWindow.destroy()
}

ipcMain.on('setting-changed', (_event, partial: Partial<Settings>) => {
  settings = { ...settings, ...partial }

  if (partial.lyricsEnabled !== undefined) {
    if (partial.lyricsEnabled) {
      enableLyricsWindow()
    } else {
      disableLyricsWindow()
    }
  }

  if (partial.lyricsLocked !== undefined) {
    lyricsWindow.setLocked(partial.lyricsLocked)
  }

  saveSettings()

  if (partial.lyricsFontSize !== undefined || partial.lyricsColor !== undefined) {
    const sizeMap: Record<string, string> = { small: '16px', medium: '20px', large: '28px' }
    lyricsWindow.setStyle(sizeMap[settings.lyricsFontSize] || '20px', settings.lyricsColor)
  }

  if (partial.alwaysOnTop !== undefined && mainWindow) {
    mainWindow.setAlwaysOnTop(partial.alwaysOnTop)
  }
})

function execMediaControl(js: string): void {
  if (!webviewDevtools) return
  webviewDevtools.sendCommand('Runtime.evaluate', { expression: js }).catch(() => {
    console.warn('[debugger] 播放控制执行失败')
  })
}

async function main(): Promise<void> {
  createWindow()

  try {
    await initMpris({
      onPlay: () => execMediaControl('document.querySelector("[class*=play]")?.click()'),
      onPause: () => execMediaControl('document.querySelector("[class*=pause]")?.click()'),
      onPlayPause: () => execMediaControl('document.querySelector("[class*=play],[class*=pause]")?.click()'),
      onNext: () => execMediaControl('document.querySelector("[class*=next]")?.click()'),
      onPrevious: () => execMediaControl('document.querySelector("[class*=prev]")?.click()'),
      onStop: () => execMediaControl('document.querySelector("[class*=stop]")?.click()'),
      onSeek: () => {},
      onSetPosition: () => {}
    })
  } catch {
    console.warn('[mpris] MPRIS 初始化失败')
  }

  if (settings.lyricsEnabled) {
    setTimeout(() => enableLyricsWindow(), 2000)
  }

  createTray({
    onToggleWindow: () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow?.show()
      }
    },
    onShowSettings: () => {
      mainWindow?.show()
      mainWindow?.webContents.send('open-settings')
    },
    onQuit: () => {
      isQuitting = true
      destroyTray()
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}

app.whenReady().then(() => {
  main().catch(console.error)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
