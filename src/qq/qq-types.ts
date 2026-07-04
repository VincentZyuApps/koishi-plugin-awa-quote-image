import type { Context } from 'koishi'

export interface QQQuoteData {
  content: string
  userId: string
  username: string
  avatar: string
  guildId: string
}

export interface QQQuoteCacheRecord {
  channel_id: string
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

export interface KeyboardButton {
  render_data: { label: string; style: number }
  action: { type: number; permission: { type: number }; data: string; enter: boolean }
}

export interface KeyboardRow {
  rows: { buttons: KeyboardButton[] }[]
}

declare module 'koishi' {
  interface Tables {
    awa_quote_image_qq_quote_cache: QQQuoteCacheRecord
  }
}
