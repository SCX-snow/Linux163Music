import { Menu, Tray, nativeImage, app } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

let tray: Tray | null = null

const ICON_B64 =
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN0AGxPdABtj3QAbpN0AG9LdABvz3QAb/90AG//dABvz3QAb0t0AG6TdABtj3QAbEwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN0AGy7dABun3QAb+t0AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv63QAbp90AGy4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN0AGw3dABuX3QAb/t0AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/t0AG5fdABsNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADdABsr3QAb290AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG9vdABsrAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3QAbON0AG/HdABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG/HdABs4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN0AGyvdABvx3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/+InPv/pXW7/50te/94GIP/dABv/3QAb/90AG//dABv/3QAb/90AG/HdABsrAAAAAAAAAAAAAAAAAAAAAAAAAADdABsN3QAb290AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//ugo//////////////////+tre/+EcNP/dABv/3QAb/90AG//dABv/3QAb/90AG9vdABsNAAAAAAAAAAAAAAAAAAAAAN0AG5fdABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/+ATLP/ufYv/7n2L/90BHP/dABv/5TpP////////////+dLX//729///////7XqI/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG5cAAAAAAAAAAAAAAADdABsu3QAb/t0AG//dABv/3QAb/90AG//dABv/3QAb/90AG//pWGr//e7w////////////4Bkx/90AG//teoj///////fGzP/dABv/4ypB/++Jlf/gGTH/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/t0AGy4AAAAAAAAAAN0AG6fdABv/3QAb/90AG//dABv/3QAb/90AG//dABv/7XiG/////////////Ojq/+tsfP/dABv/3QAb/+tre///////+dPY/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAbpwAAAADdABsT3QAb+t0AG//dABv/3QAb/90AG//dABv/3QAb/+pfcP////////////Sttv/fDij/3QAb/90AG//iIjn/8JKe////////////8p6o/+pic//fDij/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv63QAbE90AG2PdABv/3QAb/90AG//dABv/3QAb/90AG//gGTH//fLz///////zpa//3QEc/90AG//eBiD/8I6a//76+/////////////////////////////zs7v/pWmv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABtj3QAbpN0AG//dABv/3QAb/90AG//dABv/3QAb//COmv//////++Dj/94KJP/dABv/3QAb//SrtP////////////fDyf/3wsj///////zs7v/97/H////////////raXn/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG6TdABvS3QAb/90AG//dABv/3QAb/90AG//dAx7//Ors///////rZ3f/3QAb/90AG//oU2X///////77+//pV2n/3QAb/+dJXP///////Ofq/98QKf/0rrf////////8/P/jMEb/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb0t0AG/PdABv/3QAb/90AG//dABv/3QAb/+MsQv///////////+ATLP/dABv/3QAb//a7wv//////74mV/90AG//dABv/3gkj//73+P//////4y9F/94GIP/4ytD///////W1vf/dABv/3QAb/90AG//dABv/3QAb/90AG//dABvz3QAb/90AG//dABv/3QAb/90AG//dABv/50xf///////74uX/3QAb/90AG//dABv//Ozu///////kNkv/3QAb/90AG//dABv/98DH///////qYnP/3QAb/+ZEWP////////39/+ATLP/dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//pW2z///////rX2//dABv/3QAb/90AG//86ev//////+U7UP/dABv/3QAb/90AG//0r7f//////+xwf//dABv/3QMe//709f//////5kVZ/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG/PdABv/3QAb/90AG//dABv/3QAb/+dIW////////fDy/90AG//dABv/3QAb//Wxuf//////9Kmy/90AG//dABv/4BUu//zr7f//////50hb/90AG//dABv/+t3h///////oVmj/3QAb/90AG//dABv/3QAb/90AG//dABvz3QAb0t0AG//dABv/3QAb/90AG//dABv/4Rsz////////////4zBG/90AG//dABv/5DhN///9/f//////+c/U/Ofq//in6//+9vj/9sXK/94GIP/dABv/90AG//97e///////+dKXf/dABv/3QAb/90AG//dABv/3QAb/90AG9LdABuk3QAb/90AG//dABv/3QAb/90AG//dABv/+dHW///////wkp7/3QAb/90AG//dABv/6l5v//73+P/////////////////73+L/4yxC/90AG//dABv/4zBG////////////4Rsz/90AG//dABv/3QAb/90AG//dABv/3QAbpN0AG2PdABv/3QAb/90AG//dABv/3QAb/90AG//raHj///////76+//jK0H/3QAb/90AG//dABv/4Bkx/+tsfP/ufoz/6Vdp/94JI//dABv/3QAb/90AG//0rbb///////jJz//dABv/3QAb/90AG//dABv/3QAb/90AG//dABtj3QAbE90AG/rdABv/3QAb/90AG//dABv/3QAb/94FH//51dn///////rd4f/hGzP/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/62t7////////////501g/90AG//dABv/3QAb/90AG//dABv/3QAb+t0AGxMAAAAA3QAbp90AG//dABv/3QAb/90AG//dABv/3QAb/+MtQ//98fL///////zn6v/nSVz/3QAb/90AG//dABv/3QAb/90AG//dABv/3gsl//CQnP////////////Kfqf/dABv/3QAb/90AG//dABv/3QAb/90AG//dABunAAAAAAAAAADdABsu3QAb/t0AG//dABv/3QAb/90AG//dABv/3QAb/+Q4Tf/97vD////////////4yM7/7XWE/+dIW//lOU7/6FJk//CQnP/87O7////////////0qrP/3gYg/90AG//dABv/3QAb/90AG//dABv/3QAb/t0AGy4AAAAAAAAAAAAAAADdABuX3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/+EcNP/1srr////////////////////////////////////////////98PL/62p6/90BHP/dABv/3QAb/90AG//dABv/3QAb/90AG//dABuXAAAAAAAAAAAAAAAAAAAAAN0AGw3dABvb3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//kM0n/8I6a//jO0//97vD//vX2//vk5//1tLz/62h4/98MJv/dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb290AGw0AAAAAAAAAAAAAAAAAAAAAAAAAAN0AGyvdABvx3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG/HdABsrAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN0AGzjdABvx3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABvx3QAbOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN0AGyvdABvb3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb290AGysAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN0AGw3dABuX3QAb/t0AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/t0AG5fdABsNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADdABsu3QAbp90AG/rdABv/3QAb/90AG//dABv/3QAb/90AG//dABv/3QAb/90AG//dABv63QAbp90AGy4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3QAbE90AG2PdABuk3QAb0t0AG/PdABv/3QAb/90AG/PdABvS3QAbpN0AG2PdABsTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

function createIcon(): Electron.NativeImage {
  const pngPath = join(app.getAppPath(), 'resources', 'tray-icon.png')
  if (existsSync(pngPath)) {
    const img = nativeImage.createFromPath(pngPath)
    if (!img.isEmpty()) return img
  }
  const buf = Buffer.from(ICON_B64, 'base64')
  return nativeImage.createFromBuffer(buf, { width: 32, height: 32 })
}

export function createTray(opts: {
  onToggleWindow: () => void
  onShowSettings: () => void
  onQuit: () => void
}): void {
  if (tray) return

  tray = new Tray(createIcon())
  tray.setToolTip('163音乐')

  const menu = Menu.buildFromTemplate([
    { label: '显示/隐藏主窗口', click: () => opts.onToggleWindow() },
    { type: 'separator' },
    { label: '设置', click: () => opts.onShowSettings() },
    { type: 'separator' },
    { label: '退出', click: () => opts.onQuit() }
  ])

  tray.setContextMenu(menu)
  tray.on('right-click', () => tray?.popUpContextMenu())
  tray.on('click', () => opts.onToggleWindow())
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
