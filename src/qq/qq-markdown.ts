export function buildQuoteMarkdown(content: string, username: string): string {
  return [
    `> ${content}`,
    '',
    `— ${username}`,
  ].join('\n')
}

export async function sendQQMarkdown(session: any, markdown: string, keyboard: object, throwOnError = false): Promise<void> {
  if (!['qq', 'qqguild'].includes(session.platform)) return
  try {
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
      if (now - msgTime < 5 * 60 * 1000 - 2000) {
        session.seq ||= 0
        payload.msg_id = msgId
        payload.msg_seq = ++session.seq
      }
    }

    const isDirect = session.isDirect || session.channelId?.includes?.('_')
    if (isDirect) {
      const targetUserId = session.userId || session.channelId?.split?.('_')?.[0]
      await session.bot.internal.sendPrivateMessage(targetUserId, payload)
    } else {
      await session.bot.internal.sendMessage(session.channelId, payload)
    }
  } catch (error) {
    session.logger?.warn?.('⚠️ 发送 QQ Markdown 失败（不影响图片）: %s', error)
    if (throwOnError) throw error
  }
}
