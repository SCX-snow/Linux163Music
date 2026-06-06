import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  onPlaybackUpdate: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown): void => callback(data)
    ipcRenderer.on('playback-update', handler)
    return () => ipcRenderer.removeListener('playback-update', handler)
  },
  sendMediaAction: (action: string) => ipcRenderer.send('media-action', action),

  getSettings: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('get-settings'),
  onSettingChanged: (partial: Record<string, unknown>) => ipcRenderer.send('setting-changed', partial),

  getCurrentLyrics: (): Promise<{ lines: unknown[]; title: string }> =>
    ipcRenderer.invoke('get-current-lyrics'),
  onLyricsUpdated: (callback: (data: { lines: unknown[]; title: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { lines: unknown[]; title: string }): void =>
      callback(data)
    ipcRenderer.on('lyrics-updated', handler)
    return () => ipcRenderer.removeListener('lyrics-updated', handler)
  },
  sendSongMetadata: (metadata: { title: string }) => ipcRenderer.send('song-metadata', metadata),
  sendPlaybackState: (state: string) => ipcRenderer.send('playback-state', state),
  onOpenSettings: (callback: () => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('open-settings', handler)
    return () => ipcRenderer.removeListener('open-settings', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('contextBridge 暴露失败', error)
  }
} else {
  // @ts-ignore
  ;(globalThis as any).electron = electronAPI
  // @ts-ignore
  ;(globalThis as any).api = api
}

export type Api = typeof api
