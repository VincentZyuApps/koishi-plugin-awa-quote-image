import type { Session } from 'koishi'
import type { Config } from '../config'
import type { QQQuoteCacheRuntime, QQQuoteData } from './qq-types'

export const QQ_QUOTE_CACHE_TABLE = 'awa_quote_image_qq_quote_cache'
export const DEFAULT_QQ_QUOTE_CACHE_LIMIT_PER_CHANNELID = 500
export const QQ_MSG_TYPE_QUOTE = 103
export const DEBUG_CACHE_SAMPLE_LIMIT = 12

export function getQQRawEvent(session: Session): any | null {
  return (session as any).qq?.d ?? null
}

export function resolveQQAuthorId(d: any): string {
  return d?.author?.member_openid || d?.author?.user_openid || d?.author?.id || ''
}

export function resolveQQAuthorName(d: any): string {
  return d?.author?.username || ''
}

export function resolveQQElementAuthorId(author: any): string {
  return author?.member_openid || author?.user_openid || author?.id || ''
}

export function resolveQQElementAuthorName(author: any): string {
  return author?.username || author?.nick || author?.name || resolveQQElementAuthorId(author)
}

export function resolveQQGuildId(d: any, session: Session): string {
  return d?.group_id || d?.group_openid || session.guildId || ''
}

export function resolveQQChannelId(d: any, session: Session): string {
  return d?.channel_id || d?.channelId || d?.group_id || d?.group_openid || session.channelId || session.guildId || 'global'
}

export function scopedCacheKey(channelId: string, id: string): string {
  return `${channelId || 'global'}:${id}`
}

export function getQQCacheLimitPerChannelid(config: Config): number {
  const value = Number(config.qqQuoteCacheLimitPerChannelid ?? DEFAULT_QQ_QUOTE_CACHE_LIMIT_PER_CHANNELID)
  if (!Number.isFinite(value)) return DEFAULT_QQ_QUOTE_CACHE_LIMIT_PER_CHANNELID
  return Math.max(10, Math.min(1000000, Math.floor(value)))
}

export function parseQQMessageIndices(d: any): { msgIdx?: string; refMsgIdx?: string } {
  let msgIdx: string | undefined
  let refMsgIdx: string | undefined

  if (d?.message_scene?.ext) {
    for (const ext of d.message_scene.ext) {
      if (ext.startsWith('msg_idx=')) msgIdx = ext.slice('msg_idx='.length)
      if (ext.startsWith('ref_msg_idx=')) refMsgIdx = ext.slice('ref_msg_idx='.length)
    }
  }

  // QQ 官方引用消息里，msg_elements[0].msg_idx 通常比 ext 里的 ref_msg_idx 更可靠。
  if (d?.message_type === QQ_MSG_TYPE_QUOTE && d?.msg_elements?.[0]?.msg_idx) {
    refMsgIdx = d.msg_elements[0].msg_idx
  }

  return { msgIdx, refMsgIdx }
}

export function isRefIdx(value: string | undefined): boolean {
  return !!value?.startsWith('REFIDX_')
}

export function normalizeQQContent(content: string | undefined): string {
  return (content || '').replace(/<@[^>]+>/g, '').trim()
}

export function validateCompleteQQQuoteData(data: QQQuoteData | null): QQQuoteData | null {
  if (!data?.content || !data.userId || !data.username || !data.avatar) return null
  return data
}

export function getDatabaseContext(config: Config, runtime?: QQQuoteCacheRuntime) {
  if (config.qqQuoteCacheMode !== 'database') return null
  return runtime?.getDatabaseContext() || null
}

export function getQQQuoteObject(session: Session): any | null {
  return (session as any).quote || session.event?.message?.quote || null
}

export function getQQQuoteMessageId(session: Session, d: any): string {
  const quote = getQQQuoteObject(session)
  return quote?.id || quote?.messageId || d?.message_reference?.message_id || ''
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
