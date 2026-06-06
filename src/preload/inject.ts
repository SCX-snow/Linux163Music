import { ipcRenderer } from 'electron'

const originalSetActionHandler = navigator.mediaSession.setActionHandler.bind(
  navigator.mediaSession
)
const originalMetadataSetter = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(navigator.mediaSession),
  'metadata'
)?.set

function sendToHost(type: string, payload: unknown): void {
  ipcRenderer.sendToHost(type, payload)
}

navigator.mediaSession.setActionHandler = function (
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null
): void {
  sendToHost('action-registered', { action, hasHandler: handler !== null })
  return originalSetActionHandler(action, handler)
} as typeof navigator.mediaSession.setActionHandler

if (originalMetadataSetter) {
  Object.defineProperty(navigator.mediaSession, 'metadata', {
    get(): MediaMetadata | null {
      return this._metadata ?? null
    },
    set(value: MediaMetadata | null) {
      this._metadata = value
      if (value) {
        sendToHost('metadata-changed', {
          title: value.title,
          artist: value.artist,
          album: value.album,
          artwork: value.artwork
        })
      }
      originalMetadataSetter.call(this, value)
    },
    configurable: true,
    enumerable: true
  })
}

const originalPlaybackStateSetter = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(navigator.mediaSession),
  'playbackState'
)?.set

if (originalPlaybackStateSetter) {
  Object.defineProperty(navigator.mediaSession, 'playbackState', {
    get(): MediaSessionPlaybackState {
      return this._playbackState ?? 'none'
    },
    set(value: MediaSessionPlaybackState) {
      this._playbackState = value
      sendToHost('playback-state-changed', { state: value })
      originalPlaybackStateSetter.call(this, value)
    },
    configurable: true,
    enumerable: true
  })
}

console.log('[163-inject] mediaSession 劫持已启动')
