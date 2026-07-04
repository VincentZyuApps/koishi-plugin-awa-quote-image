import type { Context } from 'koishi'
import type { Config } from './config'
import type { ImageStyleKey } from './types'
import type { QuoteData } from './quote'

export interface QuoteUserProfile {
	name: string
	avatar: string
}

export interface GroupBadgeInfo {
	levelText: string
	titleText?: string
	color: string
	bgColor: string
}

export async function resolveQuoteUserProfile(
	session: any,
	quoteData: QuoteData,
	preUserObj: QuoteUserProfile | null = null,
): Promise<QuoteUserProfile> {
	return preUserObj ?? (
		typeof session.bot.getUser === 'function'
			? await session.bot.getUser(quoteData.userId, session.channelId)
			: { name: quoteData.userId, avatar: '' }
	)
}

export async function resolveDisplayUsername(
	config: Config,
	session: any,
	quoteData: QuoteData,
	userProfile: QuoteUserProfile,
) {
	let usernameArg = userProfile?.name || quoteData.userId
	if (config.nameStyle !== 'name-only' && session.onebot) {
		const groupMemberInfo = await session.onebot.getGroupMemberInfo(quoteData.guildId, quoteData.userId)
		const groupCard = groupMemberInfo.card
		if (groupCard && groupCard.length > 0) {
			switch (config.nameStyle) {
				case 'card-only':
					usernameArg = groupCard
					break
				case 'name-card':
					usernameArg = `${userProfile.name}（${groupCard}）`
					break
				case 'card-name':
					usernameArg = `${groupCard}（${userProfile.name}）`
					break
			}
		}
	}
	return usernameArg
}

export async function resolveGroupBadgeInfo(
	ctx: Context,
	config: Config,
	session: any,
	options: any,
	quoteData: QuoteData,
	selectedStyleKey: ImageStyleKey,
): Promise<GroupBadgeInfo | undefined> {
	const isQqBubbleStyle = selectedStyleKey === 'QQ_BUBBLE'

	if (!session.onebot || !isQqBubbleStyle || !config.showGroupTitleInQqBubble) {
		return undefined
	}

	try {
		const memberInfo = await session.onebot.getGroupMemberInfo(
			quoteData.guildId,
			quoteData.userId,
		)

		const role = memberInfo.role
		const customTitle = memberInfo.title
		const level = memberInfo.level

		const levelText = `LV${level}`

		let titleText: string | undefined
		let color: string
		let bgColor: string

		if (role === 'owner') {
			titleText = customTitle || '群主'
			color = '#FF8C00'
			bgColor = 'rgba(255, 140, 0, 0.15)'
		} else if (role === 'admin') {
			titleText = customTitle || '管理员'
			color = '#1E90FF'
			bgColor = 'rgba(30, 144, 255, 0.15)'
		} else if (customTitle && customTitle.length > 0) {
			titleText = customTitle
			color = '#9370DB'
			bgColor = 'rgba(147, 112, 219, 0.15)'
		} else {
			titleText = undefined
			color = '#888888'
			bgColor = 'rgba(136, 136, 136, 0.15)'
		}

		const groupBadgeInfo = {
			levelText,
			titleText,
			color,
			bgColor,
		}

		if (config.verboseConsoleLog || options.verbose) {
			ctx.logger.info(`🏷️ 群徽章信息: ${JSON.stringify({
				role,
				customTitle,
				level,
				groupBadgeInfo,
			})}`)
		}

		return groupBadgeInfo
	} catch (error: any) {
		ctx.logger.warn(`⚠️ 获取群成员信息失败: ${error.message}`)
		return undefined
	}
}

export async function downloadAvatarBase64(ctx: Context, avatarUrl: string) {
	const avatarBuffer = await ctx.http.file(avatarUrl)
	return Buffer.from(avatarBuffer.data).toString('base64')
}
