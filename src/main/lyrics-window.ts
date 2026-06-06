import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { type LyricLine } from './lyrics'

const LYRIC_HTML_PATH = join(__dirname, 'lyrics-window.html')

export class LyricsWindow {
  private window: BrowserWindow | null = null
  private loaded = false
  private pendingLines: LyricLine[] | null = null
  private pendingLocked: boolean | null = null
  private pendingStyle: { fontSize: string; color: string } | null = null
  private onMoveCallback: ((x: number, y: number, w: number, h: number) => void) | null = null

  onMove(cb: (x: number, y: number, w: number, h: number) => void): void {
    this.onMoveCallback = cb
  }

  setPosition(ms: number): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('set-position', ms)
    }
  }

  setStyle(fontSize: string, color: string): void {
    if (this.window && !this.window.isDestroyed() && this.loaded) {
      this.window.webContents.send('set-style', fontSize, color)
    } else {
      this.pendingStyle = { fontSize, color }
    }
  }

  setLocked(locked: boolean): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.setIgnoreMouseEvents(locked, { forward: true })
      if (this.loaded) {
        this.window.webContents.send('set-locked', locked)
      } else {
        this.pendingLocked = locked
      }
    }
  }

  create(saveX?: number, saveY?: number, saveW?: number, saveH?: number): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show()
      return
    }

    this.loaded = false
    const pd = screen.getPrimaryDisplay().workArea
    const wx = saveX ?? Math.round(pd.x + (pd.width - 600) / 2)
    const wy = saveY ?? Math.round(pd.y + pd.height - 150)
    const ww = saveW ?? 600
    const wh = saveH ?? 100
    this.window = new BrowserWindow({
      width: ww,
      height: wh,
      x: wx,
      y: wy,
      title: '163music-lyrics',
      transparent: true,
      frame: false,
      resizable: true,
      maximizable: false,
      minimizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      type: 'utility',
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    this.window.loadFile(LYRIC_HTML_PATH)

    this.window.on('ready-to-show', () => {
      this.window?.setAlwaysOnTop(true, 'screen-saver')
      this.window?.show()
    })

    this.window.on('maximize', () => this.window?.unmaximize())

    this.window.webContents.on('did-finish-load', () => {
      this.loaded = true
      if (this.pendingLines) {
        this.window?.webContents.send('set-lyrics', this.pendingLines)
        this.pendingLines = null
      }
      if (this.pendingLocked !== null) {
        this.window?.webContents.send('set-locked', this.pendingLocked)
        this.pendingLocked = null
      }
      if (this.pendingStyle) {
        this.window?.webContents.send('set-style', this.pendingStyle.fontSize, this.pendingStyle.color)
        this.pendingStyle = null
      }
    })

    const reportBounds = () => {
      if (this.window && !this.window.isDestroyed()) {
        const [x, y] = this.window.getPosition()
        const [w, h] = this.window.getSize()
        this.onMoveCallback?.(x, y, w, h)
      }
    }
    this.window.on('move', reportBounds)
    this.window.on('resize', reportBounds)

    this.window.on('closed', () => {
      this.window = null
    })
  }

  destroy(): void {
    this.loaded = false
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
    this.window = null
  }

  setLyrics(lines: LyricLine[]): void {
    if (this.window && !this.window.isDestroyed() && this.loaded) {
      this.window.webContents.send('set-lyrics', lines)
    } else {
      this.pendingLines = lines
    }
  }

  getWindowPos(): { x: number; y: number } | null {
    if (!this.window || this.window.isDestroyed()) return null
    const [x, y] = this.window.getPosition()
    return { x, y }
  }

  setWindowPos(x: number, y: number): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.setPosition(x, y)
    }
  }

  isVisible(): boolean {
    return this.window !== null && !this.window.isDestroyed()
  }
}
