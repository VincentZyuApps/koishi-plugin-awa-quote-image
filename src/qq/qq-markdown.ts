import { h } from 'koishi'

export function buildQuoteMarkdown(content: string, username: string): string {
  return [
    `> ${content}`,
    '',
    `— ${username}`,
  ].join('\n')
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
