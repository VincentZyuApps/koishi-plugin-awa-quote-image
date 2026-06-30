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
const msgIdToRefIdxCache = new Map<string, string>()
const refIdxToMsgIdCache = new Map<string, string>()
const QQ_QUOTE_CACHE_TABLE = 'awa_quote_image_qq_quote_cache'
const MAX_CACHE = 200
const QQ_MSG_TYPE_QUOTE = 103
const DEBUG_CACHE_SAMPLE_LIMIT = 12

export interface QQQuoteCacheRecord {
  ref_idx: string
  message_id: string
  content: string
  user_id: string
  username: string
  updated_at: number
}

export interface QQQuoteCacheRuntime {
  getDatabaseContext(): Context | null
}

declare module 'koishi' {
  interface Tables {
    awa_quote_image_qq_quote_cache: QQQuoteCacheRecord
  }
}

function getQQRawEvent(session: Session): any | null {
  return (session as any).qq?.d ?? null
}

function resolveQQAuthorId(d: any): string {
  return d?.author?.member_openid || d?.author?.user_openid || d?.author?.id || ''
}

function resolveQQAuthorName(d: any): string {
  return d?.author?.username || ''
}

function resolveQQElementAuthorId(author: any): string {
  return author?.member_openid || author?.user_openid || author?.id || ''
}

function resolveQQElementAuthorName(author: any): string {
  return author?.username || author?.nick || author?.name || resolveQQElementAuthorId(author)
}

function resolveQQGuildId(d: any, session: Session): string {
  return d?.group_id || d?.group_openid || session.guildId || ''
}

function parseQQMessageIndices(d: any): { msgIdx?: string; refMsgIdx?: string } {
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

function isRefIdx(value: string | undefined): boolean {
  return !!value?.startsWith('REFIDX_')
}

function normalizeQQContent(content: string | undefined): string {
  return (content || '').replace(/<@[^>]+>/g, '').trim()
}

function validateCompleteQQQuoteData(data: QQQuoteData | null): QQQuoteData | null {
  if (!data?.content || !data.userId || !data.username || !data.avatar) return null
  return data
}

function getDatabaseContext(config: Config, runtime?: QQQuoteCacheRuntime): Context | null {
  if (config.qqQuoteCacheMode !== 'database') return null
  return runtime?.getDatabaseContext() || null
}

function getQQQuoteObject(session: Session): any | null {
  return (session as any).quote || session.event?.message?.quote || null
}

function getQQQuoteMessageId(session: Session, d: any): string {
  const quote = getQQQuoteObject(session)
  return quote?.id || quote?.messageId || d?.message_reference?.message_id || ''
}

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

function cacheQQMessageFromSession(session: Session): boolean {
  if (session.platform !== 'qq') return false

  const d = getQQRawEvent(session)
  if (!d) return false

  const { msgIdx } = parseQQMessageIndices(d)
  const content = normalizeQQContent(d.content || session.content)
  const messageId = d.id || session.messageId || ''

  if (messageId && msgIdx) {
    msgIdToRefIdxCache.set(messageId, msgIdx)
    refIdxToMsgIdCache.set(msgIdx, messageId)
  }

  if (!msgIdx || !content) return false

  const userId = resolveQQAuthorId(d)
  const username = resolveQQAuthorName(d)
  if (!userId || !username) return false

  msgCache.set(msgIdx, {
    content,
    userId,
    username,
  })

  if (msgCache.size > MAX_CACHE) msgCache.delete(msgCache.keys().next().value)
  if (msgIdToRefIdxCache.size > MAX_CACHE) {
    const key = msgIdToRefIdxCache.keys().next().value
    const ref = msgIdToRefIdxCache.get(key)
    msgIdToRefIdxCache.delete(key)
    if (ref) refIdxToMsgIdCache.delete(ref)
  }
  return true
}

async function upsertQQQuoteCacheToDatabase(ctx: Context, refIdx: string, messageId: string, content: string, userId: string, username: string) {
  await ctx.database.upsert(QQ_QUOTE_CACHE_TABLE, [{
    ref_idx: refIdx,
    message_id: messageId,
    content,
    user_id: userId,
    username,
    updated_at: Date.now(),
  }])
}

async function getQQQuoteCacheFromDatabase(ctx: Context, refIdx: string): Promise<{ content: string; userId: string; username: string } | null> {
  const rows = await ctx.database.get(QQ_QUOTE_CACHE_TABLE, { ref_idx: refIdx })
  const row = rows?.[0]
  if (!row?.content || !row.user_id || !row.username) return null
  return {
    content: row.content,
    userId: row.user_id,
    username: row.username,
  }
}

async function getQQMessageIdByRefIdxFromDatabase(ctx: Context, refIdx: string): Promise<string> {
  const rows = await ctx.database.get(QQ_QUOTE_CACHE_TABLE, { ref_idx: refIdx })
  return rows?.[0]?.message_id || ''
}

function sampleMapEntries(map: Map<string, string>, limit = DEBUG_CACHE_SAMPLE_LIMIT) {
  return Array.from(map.entries()).slice(-limit)
}

function sampleMsgCacheEntries(limit = DEBUG_CACHE_SAMPLE_LIMIT) {
  return Array.from(msgCache.entries()).slice(-limit).map(([key, value]) => ({
    key,
    userId: value.userId,
    username: value.username,
    contentPreview: value.content.slice(0, 40),
  }))
}

export function registerQQQuoteCacheMiddleware(ctx: Context, config: Config, runtime?: QQQuoteCacheRuntime) {
  ctx.middleware(async (session, next) => {
    const cached = cacheQQMessageFromSession(session)
    if (cached && config.verboseConsoleLog) {
      const d = getQQRawEvent(session)
      const { msgIdx } = parseQQMessageIndices(d)
      ctx.logger.info(`💾 QQ 引用缓存写入: messageId=${d?.id || session.messageId || '(empty)'}, msgIdx=${msgIdx}, userId=${resolveQQAuthorId(d)}, username=${resolveQQAuthorName(d)}`)
    }
    const databaseCtx = getDatabaseContext(config, runtime)
    if (cached && databaseCtx) {
      const d = getQQRawEvent(session)
      const { msgIdx } = parseQQMessageIndices(d)
      try {
        await upsertQQQuoteCacheToDatabase(
          databaseCtx,
          msgIdx!,
          d?.id || session.messageId || '',
          normalizeQQContent(d?.content || session.content),
          resolveQQAuthorId(d),
          resolveQQAuthorName(d),
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
    ref_idx: 'string',
    message_id: 'string',
    content: 'text',
    user_id: 'string',
    username: 'string',
    updated_at: 'integer',
  }, { primary: 'ref_idx' })
}

function getQQDebugSnapshot(session: Session, d: any): object {
  const quote = getQQQuoteObject(session)
  const ref = d?.msg_elements?.[0]
  const { refMsgIdx } = parseQQMessageIndices(d)
  return {
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
      msgCache: msgCache.has(refMsgIdx),
      refIdxToMsgId: refIdxToMsgIdCache.get(refMsgIdx),
    } : null,
  }
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
      msgCache.set(msgIdx, {
        content: curContent,
        userId: curUserId,
        username: curUsername,
      })
      if (msgCache.size > MAX_CACHE) msgCache.delete(msgCache.keys().next().value)
    }
  }

  // 3) 解析引用
  const quoteId = getQQQuoteMessageId(session, d)
  const quoteMessageIds = Array.from(new Set([
    quoteId,
    isRefIdx(refMsgIdx) ? refIdxToMsgIdCache.get(refMsgIdx) : undefined,
    refMsgIdx && !isRefIdx(refMsgIdx) ? refMsgIdx : undefined,
  ].filter(Boolean))) as string[]
  const databaseCtx = getDatabaseContext(config, runtime)
  if (isRefIdx(refMsgIdx) && databaseCtx) {
    const dbMessageId = await getQQMessageIdByRefIdxFromDatabase(databaseCtx, refMsgIdx)
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
    // 3a) 缓存命中
    const cached = msgCache.get(refMsgIdx)
    if (cached) {
      if (config.verboseConsoleLog || options?.verbose) {
        ctx.logger.info(`✅ QQ 命中 msgCache: refMsgIdx=${refMsgIdx}, userId=${cached.userId}, username=${cached.username}`)
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
      const dbCached = await getQQQuoteCacheFromDatabase(databaseCtx, refMsgIdx)
      if (dbCached) {
        if (config.verboseConsoleLog || options?.verbose) {
          ctx.logger.info(`✅ QQ 命中 database cache: refMsgIdx=${refMsgIdx}, userId=${dbCached.userId}, username=${dbCached.username}`)
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

    // 3b) 缓存未命中，走 msg_elements[0]（如果适配器原始事件提供 author，就使用被引用人的 author；绝不使用触发者 author）
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

export async function sendQQMarkdown(session: any, markdown: string, keyboard: object, throwOnError = false): Promise<void> {
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
    session.logger?.warn?.('⚠️ 发送 QQ Markdown 失败（不影响图片）: %s', error)
    if (throwOnError) throw error
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
