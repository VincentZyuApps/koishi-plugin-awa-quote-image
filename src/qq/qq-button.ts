import type { KeyboardRow } from './qq-types'

export const DEFAULT_KEYBOARD_ROWS: KeyboardRow = {
  rows: [
    {
      buttons: [
        { render_data: { label: '🔄 再来一张', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '${aqtCommandName}', enter: true } },
        { render_data: { label: '❓ 获取帮助', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '${aqtCommandName} -h', enter: true } },
      ],
    },
    {
      buttons: [
        { render_data: { label: '🎨 样式列表', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '${acsCommandName}', enter: true } },
        { render_data: { label: '🎮 玩玩别的', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '帮助菜单', enter: true } },
      ],
    },
  ],
}

export function buildQuoteKeyboard(
  cmds: { aqtCommandName: string; acsCommandName: string },
  userId: string,
  customJson?: string,
): object {
  let raw: string
  try {
    raw = customJson || JSON.stringify(DEFAULT_KEYBOARD_ROWS)
  } catch {
    raw = JSON.stringify(DEFAULT_KEYBOARD_ROWS)
  }

  const resolved = raw
    .replace(/\$\{aqtCommandName\}/g, cmds.aqtCommandName)
    .replace(/\$\{acsCommandName\}/g, cmds.acsCommandName)
    .replace(/\$\{userId\}/g, userId)

  try {
    const parsed = JSON.parse(resolved)
    if (parsed?.rows?.[0]?.buttons?.length) return parsed
  } catch {}

  return DEFAULT_KEYBOARD_ROWS
}
