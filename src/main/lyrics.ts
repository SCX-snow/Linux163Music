export interface LyricLine {
  time: number
  text: string
}

export interface LyricResult {
  lines: LyricLine[]
  title?: string
  artist?: string
  album?: string
  offset?: number
}

function parseMetaTag(tag: string, value: string): { title?: string; artist?: string; album?: string; offset?: number } | null {
  const trimmed = value.trim()
  switch (tag) {
    case 'ti': return { title: trimmed }
    case 'ar': return { artist: trimmed }
    case 'al': return { album: trimmed }
    case 'offset': return { offset: Number.parseInt(trimmed, 10) || 0 }
    default: return null
  }
}

function parseTimeLine(match: RegExpExecArray): { time: number; text: string } | null {
  const minutes = Number.parseInt(match[1], 10)
  const seconds = Number.parseInt(match[2], 10)
  const millis = match[3] ? Number.parseInt(match[3].padEnd(3, '0'), 10) : 0
  const text = match[4].trim()
  if (!text) return null
  return { time: minutes * 60000 + seconds * 1000 + millis, text }
}

export function parseLrc(lrcText: string): LyricResult {
  const lines: LyricLine[] = []
  const meta: { title?: string; artist?: string; album?: string; offset?: number } = {}

  const lineRegex = /^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/
  const metaRegex = /^\[(ti|ar|al|offset):(.*)\]$/

  for (const raw of lrcText.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    const metaMatch = metaRegex.exec(line)
    if (metaMatch) {
      const tagMeta = parseMetaTag(metaMatch[1], metaMatch[2])
      if (tagMeta) Object.assign(meta, tagMeta)
      continue
    }

    const match = lineRegex.exec(line)
    if (match) {
      const parsed = parseTimeLine(match)
      if (parsed) lines.push(parsed)
    }
  }

  lines.sort((a, b) => a.time - b.time)
  return { lines, ...meta }
}

export function findCurrentLine(lines: LyricLine[], positionMs: number): number {
  if (lines.length === 0) return -1
  if (positionMs < lines[0].time) return -1

  for (let i = lines.length - 1; i >= 0; i--) {
    if (positionMs >= lines[i].time) return i
  }
  return -1
}
