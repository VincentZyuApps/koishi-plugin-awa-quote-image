import { h } from 'koishi'
import type { Context, Session } from 'koishi'
import type { Config } from './config'

export interface QQQuoteData {
  content: string
  userId: string
  username: string
  avatar: string
  guildId: string
}

// ── 引用消息缓存（内存级，重启后清空）──
const msgCache = new Map<string, { content: string; userId: string; username: string }>()
const MAX_CACHE = 200

export async function resolveQQData(session: Session, options: any, ctx: Context, config: Config): Promise<QQQuoteData | null> {
  if (session.platform !== 'qq') return null

  const d = (session as any).qq?.d as any
  if (!d) return null

  const bot = session.bot as any
  const botUinSource = config.qqBotUin ? 'config.qqBotUin' : 'bot.config.id'
  const resolvedBotUin = config.qqBotUin || bot.config?.id || ''
  const botUinMsg = `[awa-quote-image] QQ 官方 Bot 头像 botUin 来源: ${botUinSource}, value: ${resolvedBotUin || '(空)'}`

  if (config.verboseConsoleLog || options?.verbose) ctx.logger.info(botUinMsg)
  if (config.verboseSessionLog || options?.verbose) await session.send(botUinMsg)

  const avatarUrl = (userId: string) => config.qqBotUin
    ? `https://q.qlogo.cn/qqapp/${config.qqBotUin}/${userId}/640`
    : `https://q.qlogo.cn/qqapp/${bot.config?.id}/${userId}/640`

  // 1) 解析 ext 数组
  let msgIdx: string | undefined
  let refMsgIdx: string | undefined
  if (d.message_scene?.ext) {
    for (const ext of d.message_scene.ext) {
      if (ext.startsWith('msg_idx=')) msgIdx = ext.slice('msg_idx='.length)
      if (ext.startsWith('ref_msg_idx=')) refMsgIdx = ext.slice('ref_msg_idx='.length)
    }
  }

  // 2) 缓存当前消息（供后续引用）
  const curContent = d.content?.replace(/<@[^>]+>/g, '').trim() || ''
  if (msgIdx && curContent) {
    msgCache.set(msgIdx, { content: curContent, userId: d.author?.id, username: d.author?.username || '' })
    if (msgCache.size > MAX_CACHE) msgCache.delete(msgCache.keys().next().value)
  }

  // 3) 解析引用
  if (refMsgIdx) {
    // 3a) 缓存命中
    const cached = msgCache.get(refMsgIdx)
    if (cached) {
      return {
        content: cached.content,
        userId: cached.userId,
        username: cached.username || cached.userId,
        avatar: avatarUrl(cached.userId),
        guildId: d.group_id || session.guildId,
      }
    }

    // 3b) 缓存未命中，走 msg_elements[0]（官方 API 内联引用原文）
    if (d.message_type === 103 && d.msg_elements?.[0]?.content) {
      const ref = d.msg_elements[0]
      return {
        content: ref.content,
        userId: session.userId,
        username: d.author?.username || session.event?.user?.name || session.username || session.userId,
        avatar: avatarUrl(session.userId),
        guildId: d.group_id || session.guildId,
      }
    }
  }

  return null
}

export interface KeyboardButton {
  render_data: { label: string; style: number }
  action: { type: number; permission: { type: number }; data: string; enter: boolean }
}

export interface KeyboardRow {
  rows: { buttons: KeyboardButton[] }[]
}

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

export function buildQuoteMarkdown(content: string, username: string): string {
  return [
    `> ${content}`,
    '',
    `— ${username}`,
  ].join('\n')
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

export async function sendQQMarkdown(session: any, markdown: string, keyboard: object): Promise<void> {
  try {
    if (session.bot?.config?.autoStreamText) {
      await session.send(h('qq:rawmarkdown', { content: markdown, keyboard }))
    } else {
      const payload: any = {
        msg_type: 2,
        markdown: { content: markdown },
      }
      if ((keyboard as any)?.rows?.length) {
        payload.keyboard = { content: keyboard }
      }

      const msgId = session.messageId
      if (msgId) {
        const now = Date.now()
        const msgTime = session.timestamp ?? now
        if (now - msgTime < 300000) {
          payload.msg_id = msgId
          payload.msg_seq = Math.floor(Math.random() * 0xffffff) + 1
        }
      }

      await session.bot.internal.sendMessage(session.channelId, payload)
    }
  } catch (error) {
    session.logger?.warn?.('[awa-quote-image] 发送 QQ Markdown 失败（不影响图片）: %s', error)
  }
}

export function stringifyCompact(obj: object): string {
  const raw = JSON.stringify(obj, null, 2)
  return raw
    .split('\n')
    .map((line) => {
      const trimmed = line.trimEnd()
      if (trimmed.length > 80 && trimmed.endsWith('}') && trimmed.includes('{')) {
        return trimmed
      }
      return trimmed
    })
    .join('\n')
}
