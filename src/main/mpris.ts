import type { MessageBus } from '@homebridge/dbus-native'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbus = require('@homebridge/dbus-native')

const BUS_NAME = 'org.mpris.MediaPlayer2.163music'
const ROOT_PATH = '/org/mpris/MediaPlayer2'
const IFACE_ROOT = 'org.mpris.MediaPlayer2'
const IFACE_PLAYER = 'org.mpris.MediaPlayer2.Player'

let bus: MessageBus | null = null

export type PlaybackState = 'Playing' | 'Paused' | 'Stopped'

export interface SongMetadata {
  title: string
  artist: string
  album: string
  artUrl: string
  length: number
}

export interface MprisCallbacks {
  onPlay: () => void
  onPause: () => void
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  onStop: () => void
  onSeek: (offset: number) => void
  onSetPosition: (trackId: string, position: number) => void
}

let currentState: PlaybackState = 'Stopped'
let callbacks: MprisCallbacks | null = null

function buildMetaArray(data: Partial<SongMetadata>): unknown[] {
  const meta: unknown[] = [
    ['mpris:trackid', ['o', '/org/mpris/MediaPlayer2/Track/1']]
  ]
  if (data.title) meta.push(['xesam:title', ['s', data.title]])
  if (data.artist) meta.push(['xesam:artist', ['as', [data.artist]]])
  if (data.album) meta.push(['xesam:album', ['s', data.album]])
  if (data.artUrl) meta.push(['mpris:artUrl', ['s', data.artUrl]])
  if (data.length) meta.push(['mpris:length', ['x', data.length]])
  return meta
}

function emitPropertiesChanged(ifaceName: string, changes: unknown[]): void {
  if (!bus) {
    return
  }
  ;(bus as any).connection.message({
    type: dbus.messageType.signal,
    path: ROOT_PATH,
    interface: 'org.freedesktop.DBus.Properties',
    member: 'PropertiesChanged',
    signature: 'sa{sv}as',
    body: [ifaceName, changes, []]
  })
}

export async function initMpris(cbs: MprisCallbacks): Promise<void> {
  if (bus) return
  callbacks = cbs

  const sessionBus = dbus.sessionBus()
  bus = sessionBus

  await new Promise<void>((resolve, reject) => {
    sessionBus.requestName(BUS_NAME, 0x4, (err: Error | null) => {
      if (err) {
        console.warn('[mpris] 总线名已被占用，尝试接管')
      }
      resolve()
    })
  })

  const rootDesc = {
    name: IFACE_ROOT,
    methods: {
      Quit: ['', '', [], []],
      Raise: ['', '', [], []]
    },
    properties: {
      Identity: 's',
      DesktopEntry: 's',
      SupportedUriSchemes: 'as',
      SupportedMimeTypes: 'as',
      HasTrackList: 'b',
      CanQuit: 'b',
      CanRaise: 'b',
      CanSetFullscreen: 'b',
      Fullscreen: 'b'
    }
  }

  const rootImpl: Record<string, unknown> = {
    Identity: '163音乐',
    DesktopEntry: '163-music',
    SupportedUriSchemes: ['http', 'https'],
    SupportedMimeTypes: ['audio/mpeg', 'audio/flac'],
    HasTrackList: false,
    CanQuit: true,
    CanRaise: false,
    CanSetFullscreen: false,
    Fullscreen: false,
    Quit: () => callbacks?.onStop(),
    Raise: () => {},
    emit: () => {}
  }

  sessionBus.exportInterface(rootImpl, ROOT_PATH, rootDesc)

  const playerDesc = {
    name: IFACE_PLAYER,
    methods: {
      Next: ['', '', [], []],
      Previous: ['', '', [], []],
      Pause: ['', '', [], []],
      PlayPause: ['', '', [], []],
      Stop: ['', '', [], []],
      Play: ['', '', [], []],
      Seek: ['x', '', ['Offset'], []],
      SetPosition: ['o', '', ['TrackId', 'Position'], []]
    },
    properties: {
      PlaybackStatus: 's',
      LoopStatus: 's',
      Rate: 'd',
      Shuffle: 'b',
      Metadata: 'a{sv}',
      Volume: 'd',
      Position: 'x',
      MinimumRate: 'd',
      MaximumRate: 'd',
      CanGoNext: 'b',
      CanGoPrevious: 'b',
      CanPlay: 'b',
      CanPause: 'b',
      CanSeek: 'b',
      CanControl: 'b'
    }
  }

  const playerImpl: Record<string, unknown> = {
    PlaybackStatus: currentState,
    LoopStatus: 'None',
    Rate: 1,
    Shuffle: false,
    Metadata: [],
    Volume: 1,
    Position: 0,
    MinimumRate: 1,
    MaximumRate: 1,
    CanGoNext: true,
    CanGoPrevious: true,
    CanPlay: true,
    CanPause: true,
    CanSeek: false,
    CanControl: true,
    Next: () => callbacks?.onNext(),
    Previous: () => callbacks?.onPrevious(),
    Pause: () => callbacks?.onPause(),
    PlayPause: () => callbacks?.onPlayPause(),
    Stop: () => callbacks?.onStop(),
    Play: () => callbacks?.onPlay(),
    Seek: (offset: number) => callbacks?.onSeek(offset),
    SetPosition: (trackId: string, position: number) => callbacks?.onSetPosition(trackId, position),
    emit: () => {}
  }

  sessionBus.exportInterface(playerImpl, ROOT_PATH, playerDesc)
}

export function updatePlaybackStatus(state: PlaybackState): void {
  currentState = state
  emitPropertiesChanged(IFACE_PLAYER, [['PlaybackStatus', ['s', state]]])
}

export function updateSongMetadata(data: Partial<SongMetadata>): void {
  const arr = buildMetaArray(data)
  emitPropertiesChanged(IFACE_PLAYER, [['Metadata', ['a{sv}', arr]]])
}

export function destroyMpris(): void {
  if (bus) {
    ;(bus as any).connection.stream.end()
    bus = null
  }
}
