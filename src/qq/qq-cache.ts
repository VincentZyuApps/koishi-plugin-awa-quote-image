import type { Context, Session } from 'koishi'
import type { Config } from '../config'
import type { QQQuoteCacheRuntime } from './qq-types'
import {
  getDatabaseContext,
  getQQCacheLimitPerChannelid,
  getQQRawEvent,
  normalizeQQContent,
  parseQQMessageIndices,
  QQ_QUOTE_CACHE_TABLE,
  resolveQQAuthorId,
  resolveQQAuthorName,
  resolveQQChannelId,
  scopedCacheKey,
} from './qq-utils'

export const msgCache = new Map<string, { channelId: string; refIdx: string; content: string; userId: string; username: string }>()
export const msgIdToRefIdxCache = new Map<string, string>()
export const refIdxToMsgIdCache = new Map<string, string>()

function isScopedKeyInChannel(key: string, channelId: string) {
  return key.startsWith(`${channelId || 'global'}:`)
}

function pruneQQMemoryCacheForChannel(channelId: string, limit: number) {
  let msgCount = 0
  for (const key of msgCache.keys()) {
    if (!isScopedKeyInChannel(key, channelId)) continue
    msgCount++
    if (msgCount > limit) msgCache.delete(key)
  }

  let refCount = 0
  for (const [key, messageId] of refIdxToMsgIdCache.entries()) {
    if (!isScopedKeyInChannel(key, channelId)) continue
    refCount++
    if (refCount > limit) {
      refIdxToMsgIdCache.delete(key)
      msgIdToRefIdxCache.delete(scopedCacheKey(channelId, messageId))
    }
  }

  let messageCount = 0
  for (const [key, refIdx] of msgIdToRefIdxCache.entries()) {
    if (!isScopedKeyInChannel(key, channelId)) continue
    messageCount++
    if (messageCount > limit) {
      msgIdToRefIdxCache.delete(key)
      refIdxToMsgIdCache.delete(scopedCacheKey(channelId, refIdx))
    }
  }
}

export function cacheQQMemoryMessage(
  channelId: string,
  refIdx: string,
  content: string,
  userId: string,
  username: string,
  config: Config,
) {
  msgCache.set(scopedCacheKey(channelId, refIdx), {
    channelId,
    refIdx,
    content,
    userId,
    username,
  })
  pruneQQMemoryCacheForChannel(channelId, getQQCacheLimitPerChannelid(config))
}

function cacheQQMessageIdMapping(channelId: string, messageId: string, refIdx: string, config: Config) {
  msgIdToRefIdxCache.set(scopedCacheKey(channelId, messageId), refIdx)
  refIdxToMsgIdCache.set(scopedCacheKey(channelId, refIdx), messageId)
  pruneQQMemoryCacheForChannel(channelId, getQQCacheLimitPerChannelid(config))
}

function cacheQQMessageFromSession(session: Session, config: Config): boolean {
  if (session.platform !== 'qq') return false

  const d = getQQRawEvent(session)
  if (!d) return false

  const channelId = resolveQQChannelId(d, session)
  const { msgIdx } = parseQQMessageIndices(d)
  const content = normalizeQQContent(d.content || session.content)
  const messageId = d.id || session.messageId || ''

  if (messageId && msgIdx) {
    cacheQQMessageIdMapping(channelId, messageId, msgIdx, config)
  }

  if (!msgIdx || !content) return false

  const userId = resolveQQAuthorId(d)
  const username = resolveQQAuthorName(d)
  if (!userId || !username) return false

  cacheQQMemoryMessage(channelId, msgIdx, content, userId, username, config)
  return true
}

async function pruneQQQuoteCacheDatabase(ctx: Context, channelId: string, limit: number) {
  const expiredRows = await ctx.database.get(QQ_QUOTE_CACHE_TABLE, { channel_id: channelId }, {
    sort: { updated_at: 'desc' },
    offset: limit,
  })
  await Promise.all(expiredRows.map((row) => ctx.database.remove(QQ_QUOTE_CACHE_TABLE, {
    channel_id: row.channel_id,
    ref_idx: row.ref_idx,
  })))
}

export async function upsertQQQuoteCacheToDatabase(
  ctx: Context,
  channelId: string,
  refIdx: string,
  messageId: string,
  content: string,
  userId: string,
  username: string,
  limit: number,
) {
  await ctx.database.upsert(QQ_QUOTE_CACHE_TABLE, [{
    channel_id: channelId,
    ref_idx: refIdx,
    message_id: messageId,
    content,
    user_id: userId,
    username,
    updated_at: Date.now(),
  }])
  await pruneQQQuoteCacheDatabase(ctx, channelId, limit)
}

export async function getQQQuoteCacheFromDatabase(ctx: Context, channelId: string, refIdx: string): Promise<{ content: string; userId: string; username: string } | null> {
  const rows = await ctx.database.get(QQ_QUOTE_CACHE_TABLE, { channel_id: channelId, ref_idx: refIdx })
  const row = rows?.[0]
  if (!row?.content || !row.user_id || !row.username) return null
  return {
    content: row.content,
    userId: row.user_id,
    username: row.username,
  }
}

export async function getQQMessageIdByRefIdxFromDatabase(ctx: Context, channelId: string, refIdx: string): Promise<string> {
  const rows = await ctx.database.get(QQ_QUOTE_CACHE_TABLE, { channel_id: channelId, ref_idx: refIdx })
  return rows?.[0]?.message_id || ''
}

export function registerQQQuoteCacheMiddleware(ctx: Context, config: Config, runtime?: QQQuoteCacheRuntime) {
  ctx.middleware(async (session, next) => {
    const cached = cacheQQMessageFromSession(session, config)
    if (cached && config.verboseConsoleLog) {
      const d = getQQRawEvent(session)
      const channelId = resolveQQChannelId(d, session)
      const { msgIdx } = parseQQMessageIndices(d)
      ctx.logger.info(`💾 QQ 引用缓存写入: channelId=${channelId}, messageId=${d?.id || session.messageId || '(empty)'}, msgIdx=${msgIdx}, userId=${resolveQQAuthorId(d)}, username=${resolveQQAuthorName(d)}`)
    }
    const databaseCtx = getDatabaseContext(config, runtime)
    if (cached && databaseCtx) {
      const d = getQQRawEvent(session)
      const channelId = resolveQQChannelId(d, session)
      const { msgIdx } = parseQQMessageIndices(d)
      try {
        await upsertQQQuoteCacheToDatabase(
          databaseCtx,
          channelId,
          msgIdx!,
          d?.id || session.messageId || '',
          normalizeQQContent(d?.content || session.content),
          resolveQQAuthorId(d),
          resolveQQAuthorName(d),
          getQQCacheLimitPerChannelid(config),
        )
      } catch (error: any) {
        ctx.logger.warn(`⚠️ QQ 引用缓存写入 database 失败，已保留内存缓存: ${error?.message || error}`)
      }
    }
    return next()
  }, true)
}

export function setupQQQuoteCacheDatabase(ctx: Context, config: Config) {
  if (config.qqQuoteCacheMode !== 'database') return
  ctx.model.extend(QQ_QUOTE_CACHE_TABLE, {
    channel_id: 'string',
    ref_idx: 'string',
    message_id: 'string',
    content: 'text',
    user_id: 'string',
    username: 'string',
    updated_at: 'integer',
  }, { primary: ['channel_id', 'ref_idx'] })
}
