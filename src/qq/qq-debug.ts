import type { Session } from 'koishi'
import { msgCache, msgIdToRefIdxCache, refIdxToMsgIdCache } from './qq-cache'
import {
  DEBUG_CACHE_SAMPLE_LIMIT,
  getQQQuoteObject,
  getQQRawEvent,
  parseQQMessageIndices,
  resolveQQChannelId,
  scopedCacheKey,
} from './qq-utils'

export function sampleMapEntries(map: Map<string, string>, limit = DEBUG_CACHE_SAMPLE_LIMIT) {
  return Array.from(map.entries()).slice(-limit)
}

export function sampleMsgCacheEntries(limit = DEBUG_CACHE_SAMPLE_LIMIT) {
  return Array.from(msgCache.entries()).slice(-limit).map(([key, value]) => ({
    key,
    userId: value.userId,
    username: value.username,
    contentPreview: value.content.slice(0, 40),
  }))
}

export function getQQDebugSnapshot(session: Session, d = getQQRawEvent(session)): object {
  const quote = getQQQuoteObject(session)
  const ref = d?.msg_elements?.[0]
  const { refMsgIdx } = parseQQMessageIndices(d)
  const channelId = resolveQQChannelId(d, session)
  const refCacheKey = refMsgIdx ? scopedCacheKey(channelId, refMsgIdx) : ''
  return {
    channelId,
    messageId: d?.id || session.messageId || '',
    sessionMessageId: session.messageId,
    messageReference: d?.message_reference,
    currentAuthor: d?.author,
    currentContentPreview: typeof d?.content === 'string' ? d.content.slice(0, 80) : undefined,
    messageSceneExt: d?.message_scene?.ext,
    parsedIndices: parseQQMessageIndices(d),
    sessionQuote: quote ? {
      id: quote.id,
      messageId: quote.messageId,
      hasContent: !!quote.content,
      user: quote.user,
      member: quote.member,
    } : null,
    refElement: ref ? {
      msg_idx: ref.msg_idx,
      contentPreview: typeof ref.content === 'string' ? ref.content.slice(0, 80) : undefined,
      author: ref.author,
      message_type: ref.message_type,
    } : null,
    refIdxToMsgIdCacheSize: refIdxToMsgIdCache.size,
    msgCacheSize: msgCache.size,
    cacheHitForRefIdx: refMsgIdx ? {
      refMsgIdx,
      refCacheKey,
      msgCache: msgCache.has(refCacheKey),
      refIdxToMsgId: refIdxToMsgIdCache.get(refCacheKey),
    } : null,
  }
}

export { msgIdToRefIdxCache, refIdxToMsgIdCache }
