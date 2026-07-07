import { Context, h } from 'koishi'
import type { Config } from './config'

export interface QuoteData {
	content: string
	userId: string
	guildId: string
}

export interface ResolvedQuoteContent {
	content: string
	renderContent: string
	renderContentHtml: string
}

function pickNonEmptyString(...values: any[]) {
	for (const value of values) {
		if (value === undefined || value === null) continue
		const text = String(value).trim()
		if (text.length > 0) return text
	}
	return ''
}

function escapeHtmlText(value: unknown) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function escapeHtmlAttr(value: unknown) {
	return escapeHtmlText(value).replace(/`/g, '&#96;')
}

function isSafeResourceUrl(value: string) {
	return /^(https?:\/\/|data:image\/|file:|base64:\/\/)/i.test(value)
}

function normalizeResourceUrlForBrowser(value: string) {
	if (/^base64:\/\//i.test(value)) {
		return `data:image/png;base64,${value.slice('base64://'.length)}`
	}
	return value
}

function pickResourceUrl(attrs: any) {
	const url = pickNonEmptyString(attrs?.src, attrs?.url, attrs?.file)
	return url && isSafeResourceUrl(url) ? normalizeResourceUrlForBrowser(url) : ''
}

function renderInlineImageHtml(src: string, alt: string, className = 'quote-inline-image') {
	return `<img class="${className}" src="${escapeHtmlAttr(src)}" alt="${escapeHtmlAttr(alt)}">`
}

function addTextBreakOpportunities(text: string) {
	const zeroWidthSpace = '\u200B'
	const breakAfterChars = new Set(['/', '.', '-', '_', '~', ':', '?', '#', '[', ']', '!', '$', '&', "'", '(', ')', '*', '+', ',', ';', '='])
	let asciiRunLength = 0
	let result = ''

	for (const char of Array.from(text.replace(/\u200B/g, ''))) {
		result += char

		if (breakAfterChars.has(char)) {
			result += zeroWidthSpace
			asciiRunLength = 0
			continue
		}

		if (/^[A-Za-z0-9]$/.test(char)) {
			asciiRunLength++
			if (asciiRunLength >= 12) {
				result += zeroWidthSpace
				asciiRunLength = 0
			}
		} else {
			asciiRunLength = 0
		}
	}

	return result
}

function renderMentionText(displayName: string, forImage: boolean) {
	if (!displayName) return ''
	if (!forImage || displayName.length < 16) return `@${displayName}`
	return `@${addTextBreakOpportunities(displayName)}`
}

type RenderMode = 'text' | 'image-text' | 'html'

export async function resolveQuoteContentForRender(
	ctx: Context,
	config: Config,
	session: any,
	options: any,
	quoteData: QuoteData,
): Promise<ResolvedQuoteContent> {
	if (!quoteData.content) return { content: '', renderContent: '', renderContentHtml: '' }

	const isVerbose = config.verboseConsoleLog || options.verbose
	const memberInfoCache = new Map<string, Promise<any | null>>()

	async function getMentionedMemberInfo(userId: string) {
		const cacheKey = `${quoteData.guildId || session.channelId || ''}:${userId}`
		if (!memberInfoCache.has(cacheKey)) {
			memberInfoCache.set(cacheKey, (async () => {
				try {
					if (typeof session.onebot?.getGroupMemberInfo === 'function' && quoteData.guildId) {
						return await session.onebot.getGroupMemberInfo(quoteData.guildId, userId)
					}
					if (typeof session.bot?.getChannelMember === 'function' && session.channelId) {
						return await session.bot.getChannelMember(session.channelId, userId)
					}
				} catch (error: any) {
					if (isVerbose) {
						ctx.logger.warn(`⚠️ 获取 @ 用户信息失败: guildId=${quoteData.guildId || '(empty)'}, userId=${userId}, error=${error?.message || error}`)
					}
				}
				return null
			})())
		}
		return memberInfoCache.get(cacheKey)!
	}

	async function renderAtElement(attrs: any, forImage: boolean) {
		if (config.atRenderMode === 'none') return ''

		const userId = pickNonEmptyString(attrs?.id, attrs?.userId, attrs?.qq)
		const fallbackName = pickNonEmptyString(attrs?.name, attrs?.nickname, attrs?.nick, userId)
		if (!userId) return renderMentionText(fallbackName, forImage)

		const memberInfo = await getMentionedMemberInfo(userId)
		const memberUser = memberInfo?.user || {}
		const displayName = config.atRenderMode === 'nick'
			? pickNonEmptyString(
				memberInfo?.card,
				memberInfo?.nick,
				memberInfo?.nickname,
				memberInfo?.name,
				memberUser?.nick,
				memberUser?.nickname,
				memberUser?.name,
				memberUser?.username,
				attrs?.name,
				userId,
			)
			: pickNonEmptyString(
				memberUser?.name,
				memberUser?.username,
				memberInfo?.nickname,
				memberInfo?.name,
				memberInfo?.username,
				attrs?.name,
				userId,
			)

		return renderMentionText(displayName, forImage)
	}

	async function renderElements(elements: any[], mode: RenderMode): Promise<string> {
		const chunks = await Promise.all(elements.map((element) => renderElement(element, mode)))
		return chunks.join('')
	}

	function getResourceFallbackText(attrs: any, fallback: string) {
		return pickNonEmptyString(attrs.title, attrs.summary, attrs.alt, attrs.name, attrs.text, fallback)
	}

	function getNestedImageUrl(element: any): string {
		const children = Array.isArray(element?.children) ? element.children : []
		for (const child of children) {
			if (!child) continue
			if (child.type === 'img' || child.type === 'image') {
				const url = pickResourceUrl(child.attrs || {})
				if (url) return url
			}
			const nested = getNestedImageUrl(child)
			if (nested) return nested
		}
		return ''
	}

	async function renderElement(element: any, mode: RenderMode): Promise<string> {
		const type = element?.type
		const attrs = element?.attrs || {}

		if (type === 'text') {
			const text = String(attrs.content ?? '')
			return mode === 'html' ? escapeHtmlText(text) : text
		}
		if (type === 'at') {
			const text = await renderAtElement(attrs, mode !== 'text')
			return mode === 'html' ? escapeHtmlText(text) : text
		}
		if (type === 'br') return mode === 'html' ? '<br>' : '\n'
		if (type === 'sharp') {
			const channelName = pickNonEmptyString(attrs.name, attrs.id)
			const text = channelName ? `#${channelName}` : ''
			return mode === 'html' ? escapeHtmlText(text) : text
		}
		if (type === 'img' || type === 'image') {
			const fallbackText = getResourceFallbackText(attrs, '[图片]')
			if (mode !== 'html') return fallbackText

			const src = pickResourceUrl(attrs)
			return src ? renderInlineImageHtml(src, fallbackText, 'quote-message-image') : escapeHtmlText(fallbackText)
		}
		if (type === 'audio') {
			const text = '[语音]'
			return mode === 'html' ? escapeHtmlText(text) : text
		}
		if (type === 'video') {
			const text = '[视频]'
			return mode === 'html' ? escapeHtmlText(text) : text
		}
		if (type === 'file') {
			const text = pickNonEmptyString(attrs.title, attrs.name, attrs.file, '[文件]')
			return mode === 'html' ? escapeHtmlText(text) : text
		}
		if (type === 'emoji' || type === 'face' || type === 'mface') {
			const emojiName = pickNonEmptyString(attrs.summary, attrs.name, attrs.text, attrs.id)
			const fallbackText = emojiName ? `[${emojiName}]` : ''
			if (mode !== 'html') return fallbackText

			const src = pickResourceUrl(attrs) || getNestedImageUrl(element)
			const imageClass = type === 'mface' ? 'quote-inline-image quote-inline-mface' : 'quote-inline-image quote-inline-emoji'
			return src ? renderInlineImageHtml(src, fallbackText || '表情', imageClass) : escapeHtmlText(fallbackText)
		}
		if (Array.isArray(element?.children) && element.children.length > 0) {
			return renderElements(element.children, mode)
		}

		return ''
	}

	try {
		const elements = h.parse(quoteData.content) as any[]
		const content = await renderElements(elements, 'text')
		const renderContent = await renderElements(elements, 'image-text')
		const renderContentHtml = await renderElements(elements, 'html')
		if (isVerbose && content !== quoteData.content) {
			ctx.logger.info(`🔁 引用消息元素渲染结果: ${content.slice(0, 200)}${content.length > 200 ? '...' : ''}`)
		}
		return { content, renderContent, renderContentHtml }
	} catch (error: any) {
		if (isVerbose) {
			ctx.logger.warn(`⚠️ 解析引用消息元素失败，使用原始文本: ${error?.message || error}`)
		}
		return {
			content: quoteData.content,
			renderContent: quoteData.content,
			renderContentHtml: escapeHtmlText(quoteData.content),
		}
	}
}
