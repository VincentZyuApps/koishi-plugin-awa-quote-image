import type { Context, Session } from 'koishi'
import type { Config } from '../config'
import type { QQQuoteCacheRuntime, QQQuoteData } from './qq-types'
import {
  cacheQQMemoryMessage,
  getQQMessageIdByRefIdxFromDatabase,
  getQQQuoteCacheFromDatabase,
  msgCache,
  msgIdToRefIdxCache,
  refIdxToMsgIdCache,
} from './qq-cache'
import {
  getDatabaseContext,
  getQQQuoteMessageId,
  getQQQuoteObject,
  getQQRawEvent,
  isRefIdx,
  normalizeQQContent,
  parseQQMessageIndices,
  QQ_MSG_TYPE_QUOTE,
  resolveQQAuthorId,
  resolveQQAuthorName,
  resolveQQChannelId,
  resolveQQElementAuthorId,
  resolveQQElementAuthorName,
  resolveQQGuildId,
  scopedCacheKey,
  validateCompleteQQQuoteData,
} from './qq-utils'
import { getQQDebugSnapshot, sampleMapEntries, sampleMsgCacheEntries } from './qq-debug'

function buildQuotedBotData(
  author: any,
  content: string,
  config: Config,
  qqBotAppId: string,
  guildId: string,
): QQQuoteData | null {
  const username = resolveQQElementAuthorName(author)
  const botAvatarId = config.botUid || qqBotAppId
  if (!author?.bot || !username || !botAvatarId) return null

  return validateCompleteQQQuoteData({
    content,
    userId: botAvatarId,
    username,
    avatar: `https://q1.qlogo.cn/g?b=qq&nk=${botAvatarId}&s=640`,
    guildId,
  })
}

function buildQQQuoteDataFromRawMessage(raw: any, avatarUrl: (userId: string) => string, config: Config, qqBotAppId: string, guildId: string): QQQuoteData | null {
  const content = normalizeQQContent(raw?.content)
  const userId = raw?.author?.id || raw?.author?.member_openid || raw?.author?.user_openid || ''
  const username = raw?.author?.username || raw?.author?.name || ''

  return validateCompleteQQQuoteData({
    content,
    userId,
    username,
    avatar: userId ? avatarUrl(userId) : '',
    guildId,
  }) || buildQuotedBotData(raw?.author, content, config, qqBotAppId, guildId)
}

function buildQQQuoteDataFromSessionQuote(session: Session, avatarUrl: (userId: string) => string, guildId: string): QQQuoteData | null {
  const quote = getQQQuoteObject(session)
  if (!quote?.content) return null

  const userId = quote.user?.id || quote.member?.user?.id || ''
  const username = quote.user?.name || quote.member?.nick || quote.member?.user?.name || ''

  return validateCompleteQQQuoteData({
    content: quote.content,
    userId,
    username,
    avatar: quote.user?.avatar || quote.member?.user?.avatar || (userId ? avatarUrl(userId) : ''),
    guildId,
  })
}

export async function resolveQQData(session: Session, options: any, ctx: Context, config: Config, runtime?: QQQuoteCacheRuntime): Promise<QQQuoteData | null> {
  if (session.platform !== 'qq') return null

  const d = getQQRawEvent(session)
  if (!d) return null

  const bot = session.bot as any
  const qqBotAppId = config.qqBotAppId || bot.config?.id || ''
  const qqBotAppIdSource = config.qqBotAppId ? 'config.qqBotAppId' : 'bot.config.id'
  const botAppIdMsg = `🤖 QQ 官方 Bot 头像 AppId 来源: ${qqBotAppIdSource}, value: ${qqBotAppId || '(空)'}`

  if (config.verboseConsoleLog || options?.verbose) ctx.logger.info(botAppIdMsg)
  if (config.verboseSessionLog || options?.verbose) await session.send(botAppIdMsg)

  const avatarUrl = (userId: string) => qqBotAppId
    ? `https://q.qlogo.cn/qqapp/${qqBotAppId}/${userId}/640`
    : ''

  const { msgIdx, refMsgIdx } = parseQQMessageIndices(d)
  const channelId = resolveQQChannelId(d, session)
  const guildId = resolveQQGuildId(d, session)

  // 2) 缓存当前消息（供后续引用）
  const curContent = normalizeQQContent(d.content || session.content)
  if (msgIdx && curContent) {
    const curUserId = resolveQQAuthorId(d)
    const curUsername = resolveQQAuthorName(d)
    if (!curUserId || !curUsername) {
      if (config.verboseConsoleLog || options?.verbose) {
        ctx.logger.warn(`⚠️ QQ 当前消息缺少 author，跳过引用缓存: msgIdx=${msgIdx}, userId=${curUserId || '(empty)'}, username=${curUsername || '(empty)'}`)
      }
    } else {
      cacheQQMemoryMessage(channelId, msgIdx, curContent, curUserId, curUsername, config)
    }
  }

  // 3) 解析引用
  const quoteId = getQQQuoteMessageId(session, d)
  const quoteMessageIds = Array.from(new Set([
    quoteId,
    isRefIdx(refMsgIdx) ? refIdxToMsgIdCache.get(scopedCacheKey(channelId, refMsgIdx)) : undefined,
    refMsgIdx && !isRefIdx(refMsgIdx) ? refMsgIdx : undefined,
  ].filter(Boolean))) as string[]
  const databaseCtx = getDatabaseContext(config, runtime)
  if (isRefIdx(refMsgIdx) && databaseCtx) {
    const dbMessageId = await getQQMessageIdByRefIdxFromDatabase(databaseCtx, channelId, refMsgIdx)
    if (dbMessageId && !quoteMessageIds.includes(dbMessageId)) quoteMessageIds.push(dbMessageId)
  }

  if (config.verboseConsoleLog || options?.verbose) {
    ctx.logger.info(`🔍 QQ 引用解析快照: ${JSON.stringify(getQQDebugSnapshot(session, d))}`)
    ctx.logger.info(`🔍 QQ 引用候选 message_id: ${quoteMessageIds.length ? quoteMessageIds.join(', ') : '(empty)'}`)
    ctx.logger.info(`🔍 QQ msgCache 样本: ${JSON.stringify(sampleMsgCacheEntries())}`)
    ctx.logger.info(`🔍 QQ refIdxToMsgIdCache 样本: ${JSON.stringify(sampleMapEntries(refIdxToMsgIdCache))}`)
    ctx.logger.info(`🔍 QQ msgIdToRefIdxCache 样本: ${JSON.stringify(sampleMapEntries(msgIdToRefIdxCache))}`)
  }

  for (const quoteMessageId of quoteMessageIds) {
    if (!bot.internal?.getMessage) break
    try {
      const response = await bot.internal.getMessage(guildId, quoteMessageId)
      const data = buildQQQuoteDataFromRawMessage(response?.message, avatarUrl, config, qqBotAppId, guildId)
      if (config.verboseConsoleLog || options?.verbose) {
        ctx.logger.info(`🔍 QQ getMessage 返回摘要: quoteMessageId=${quoteMessageId}, raw=${JSON.stringify({
          id: response?.message?.id,
          author: response?.message?.author,
          hasContent: !!response?.message?.content,
          contentPreview: typeof response?.message?.content === 'string' ? response.message.content.slice(0, 80) : undefined,
          attachmentsCount: response?.message?.attachments?.length,
        })}`)
      }
      if (data) {
        if (config.verboseConsoleLog || options?.verbose) {
          ctx.logger.info(`✅ QQ 通过 bot.internal.getMessage 获取被引用消息: quoteMessageId=${quoteMessageId}, userId=${data.userId}, username=${data.username}`)
        }
        return data
      }
    } catch (error: any) {
      if (config.verboseConsoleLog || options?.verbose) {
        ctx.logger.warn(`⚠️ QQ bot.internal.getMessage 获取引用消息失败: quoteMessageId=${quoteMessageId}, error=${error?.message || error}`)
      }
    }
  }

  const sessionQuoteData = buildQQQuoteDataFromSessionQuote(session, avatarUrl, guildId)
  if (sessionQuoteData) {
    if (config.verboseConsoleLog || options?.verbose) {
      ctx.logger.info(`✅ QQ 从 session.quote 获取被引用消息: userId=${sessionQuoteData.userId}, username=${sessionQuoteData.username}`)
    }
    return sessionQuoteData
  }

  if (refMsgIdx) {
    const cached = msgCache.get(scopedCacheKey(channelId, refMsgIdx))
    if (cached) {
      if (config.verboseConsoleLog || options?.verbose) {
        ctx.logger.info(`✅ QQ 命中 msgCache: channelId=${channelId}, refMsgIdx=${refMsgIdx}, userId=${cached.userId}, username=${cached.username}`)
      }
      return validateCompleteQQQuoteData({
        content: cached.content,
        userId: cached.userId,
        username: cached.username,
        avatar: avatarUrl(cached.userId),
        guildId,
      })
    }

    if (databaseCtx) {
      const dbCached = await getQQQuoteCacheFromDatabase(databaseCtx, channelId, refMsgIdx)
      if (dbCached) {
        if (config.verboseConsoleLog || options?.verbose) {
          ctx.logger.info(`✅ QQ 命中 database cache: channelId=${channelId}, refMsgIdx=${refMsgIdx}, userId=${dbCached.userId}, username=${dbCached.username}`)
        }
        return validateCompleteQQQuoteData({
          content: dbCached.content,
          userId: dbCached.userId,
          username: dbCached.username,
          avatar: avatarUrl(dbCached.userId),
          guildId,
        })
      }
    }

    // 缓存未命中，走 msg_elements[0]（如果适配器原始事件提供 author，就使用被引用人的 author；绝不使用触发者 author）
    if (d.message_type === QQ_MSG_TYPE_QUOTE && d.msg_elements?.[0]?.content) {
      const ref = d.msg_elements[0]
      const quotedUserId = resolveQQElementAuthorId(ref.author)
      const quotedUsername = resolveQQElementAuthorName(ref.author)
      const quotedContent = normalizeQQContent(ref.content)

      const quotedBotData = buildQuotedBotData(ref.author, quotedContent, config, qqBotAppId, guildId)
      if (quotedBotData) {
        if (config.verboseConsoleLog || options?.verbose) {
          ctx.logger.info(`🤖 QQ 引用作者是 Bot，使用 Bot QQ 号/AppId 生成被引用 Bot 头像: refMsgIdx=${refMsgIdx}, botAvatarId=${config.botUid || qqBotAppId}, username=${quotedBotData.username}`)
        }
        return quotedBotData
      }

      if (!quotedUserId || !quotedUsername) {
        const errMsg = `❌ QQ 引用消息缺少完整的被引用人 author 信息，已停止渲染，不会使用触发 aqt 的用户信息: refMsgIdx=${refMsgIdx}, quotedUserId=${quotedUserId || '(empty)'}, quotedUsername=${quotedUsername || '(empty)'}, quotedAuthorIsBot=${!!ref.author?.bot}, qqBotAppId=${qqBotAppId || '(empty)'}, botUid=${config.botUid || '(empty)'}`
        ctx.logger.error(errMsg)
        return null
      }

      if (config.verboseConsoleLog || options?.verbose) {
        ctx.logger.info(`✅ QQ 引用缓存未命中，从 msg_elements[0].author 获取被引用人: refMsgIdx=${refMsgIdx}, quotedUserId=${quotedUserId || '(empty)'}, quotedUsername=${quotedUsername || '(empty)'}`)
      }

      return validateCompleteQQQuoteData({
        content: quotedContent,
        userId: quotedUserId,
        username: quotedUsername,
        avatar: avatarUrl(quotedUserId),
        guildId,
      })
    }
  }

  const finalErrMsg = `❌ QQ 引用解析失败：没有任何路径拿到完整的被引用消息作者信息（content/userId/username/avatar），已停止渲染。`
  ctx.logger.error(finalErrMsg)
  if (config.verboseConsoleLog || options?.verbose) {
    ctx.logger.error(`❌ QQ 引用解析失败快照: ${JSON.stringify(getQQDebugSnapshot(session, d))}`)
  }
  return null
}
