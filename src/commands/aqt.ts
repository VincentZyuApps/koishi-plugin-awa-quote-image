import { Context, h } from 'koishi'
import type { Config } from '../config'
import { renderQuoteImage } from '../render'
import { IMAGE_STYLE_KEY_ARR } from '../types'
import {
	checkAndDownloadFonts,
	DEFAULT_SOURCE_HAN_SERIF_PATH,
	fileToBase64,
	fileToBase64WithFallback,
	resolveRuntimeFontPath,
	SOURCE_HAN_SERIF_FILE_NAME,
} from '../utils'
import { resolveQuoteContentForRender, QuoteData } from '../quote'
import {
	downloadAvatarBase64,
	resolveDisplayUsername,
	resolveGroupBadgeInfo,
	resolveQuoteUserProfile,
	type QuoteUserProfile,
} from '../user'
import {
	buildQuoteKeyboard,
	buildQuoteMarkdown,
	resolveQQData,
	sendQQMarkdown,
	type QQQuoteCacheRuntime,
} from '../qq'

const PLUGIN_NAME = 'awa-quote-image'
const SOURCE_HAN_SERIF_CJK_UNICODE_RANGE = 'U+2E80-2EFF,U+3000-303F,U+31C0-31EF,U+3200-32FF,U+3400-4DBF,U+4E00-9FFF,U+F900-FAFF,U+FF00-FFEF'

function isSourceHanSerifFontPath(filePath: string) {
	return filePath.split(/[\\/]/).pop() === SOURCE_HAN_SERIF_FILE_NAME
}

export function registerAqtCommand(
	ctx: Context,
	config: Config,
	qqQuoteCacheRuntime: QQQuoteCacheRuntime,
) {
	ctx.command(
		config.aqtCommandName + ' [text:text]',
		'回复/引用某个群u说的话, 制作名人名言图片',
	)
		.alias('aqt')
		.option('imageStyleIdx', '-i, --idx, --index <idx:number> 图片样式索引')
		.option('enableDarkMode', '-d, --dark, --darkmode <enableDarkMode:string> 启用深色模式')
		.option('newlines', '--newlines, --no-newlines 是否保留原始消息换行（默认开启）')
		.option('verbose', '-v, --verbose 在session和console打印详细参数信息')
		.action(async ({ session, options }) => {
			try {
				const fontsReady = await checkAndDownloadFonts(ctx, PLUGIN_NAME, config.enableReleaseEmojiFont)
				if (!fontsReady) {
					const fontErrMsg = `❌ 字体文件下载或校验失败，已停止渲染。\n\n请确认 Koishi 可以访问 Gitee / GitHub release，或手动放置字体到 Koishi 运行目录的 data/fonts。`
					ctx.logger.error(fontErrMsg)
					await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${fontErrMsg}`)
					return
				}

				await doAqt({ session, options })
			} catch (error) {
				const errorMsg = `❌ 渲染名人名言图片失败！\n\n🔍 错误信息：${error}\n\n💡 如果问题持续，请联系管理员或查看控制台日志 📝`
				if (config.verboseSessionLog || options.verbose)
					await session.send(errorMsg)
				if (config.verboseConsoleLog || options.verbose)
					ctx.logger.error(errorMsg)
			}
		})
	ctx.logger.info(`✅ aqt 指令注册完成`)

	async function doAqt({ session, options }) {
		const isVerbose = config.verboseConsoleLog || options.verbose
		if (isVerbose) ctx.logger.info(`🔍 do_aqt: platform=${session.platform}, hasQuote=${!!session.quote}, quoteContent=${!!session.quote?.content}`)

		let quoteData: QuoteData
		let preUserObj: QuoteUserProfile | null = null

		// Priority 1: QQ 官方 / qq-crack 专用解析。
		// QQ 平台不能把作者 fallback 到触发者，否则不同人引用时头像和昵称会错。
		if (session.platform === 'qq') {
			if (isVerbose) ctx.logger.info(`🔍 do_aqt: 走 Priority 1 resolveQQData`)
			const qq = await resolveQQData(session, options, ctx, config, qqQuoteCacheRuntime)
			if (!qq) {
				const quoteAuthorErrMsg = `❌ QQ 平台未能获取被引用消息作者的完整信息（content/userId/username/avatar），已停止渲染，不会使用触发 aqt 的用户信息。`
				ctx.logger.error(quoteAuthorErrMsg)
				const markdown = [
					'# ❌ QQ 引用解析失败',
					'',
					'未能获取被引用消息作者的头像和用户名，已停止渲染。',
					'',
					'> 不会使用触发 aqt 指令的人的头像或用户名。',
					'',
					'请确认引用的是机器人在线期间可查询到的群消息，或使用 `-v` 查看控制台里的 QQ 原始事件。',
				].join('\n')
				try {
					await sendQQMarkdown(session, markdown, buildQuoteKeyboard(config, ''), true)
				} catch (error: any) {
					ctx.logger.error(`❌ QQ Markdown 错误提示发送失败: ${error?.message || error}`)
					await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}❌ QQ 平台未能获取被引用消息的作者头像和用户名，已停止渲染。\n\n不会使用触发 aqt 指令的人的头像或用户名。\n\n请确认引用的是机器人在线期间可查询到的群消息，或使用 -v 查看控制台里的 QQ 原始事件。`)
				}
				return
			}
			quoteData = qq
			preUserObj = qq.username ? { name: qq.username, avatar: qq.avatar } : null
		// Priority 2: session.quote 有内容（适用于 OneBot、qq-crack 等会填充引用内容的适配器）
		} else if (session.quote?.content) {
			if (isVerbose) ctx.logger.info(`🔍 do_aqt: 走 Priority 1 session.quote`)
			if (!session.quote.user?.id) {
				const quoteUserIdErrMsg = `❌ 未能获取被引用消息的作者 ID，已停止渲染。`
				ctx.logger.error(quoteUserIdErrMsg)
				await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}❌ 未能获取被引用消息的作者 ID，已停止渲染。`)
				return
			}
			quoteData = {
				content: session.quote.content,
				userId: session.quote.user.id,
				guildId: session.quote.guild?.id || session.guildId,
			}
		// Priority 3: 其他平台无引用
		} else {
			if (isVerbose) ctx.logger.info(`🔍 do_aqt: 无引用内容，报错`)
			await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}💬 请先回复或引用一条消息，我才能帮你制作名人名言图片哦~ 📝`)
			return
		}

		await renderAndSend({ session, options, quoteData, preUserObj })
	}

	async function renderAndSend({ session, options, quoteData, preUserObj = null }) {
		const renderStartTime = Date.now()
		const waitingHintMsgId = config.enableWaitingHint
			? (await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}🎨 正在渲染名人名言图片，请稍候... ⏳`))[0]
			: null

		const resolvedQuoteContent = await resolveQuoteContentForRender(ctx, config, session, options, quoteData)
		quoteData = {
			...quoteData,
			content: resolvedQuoteContent.content,
		}
		const renderQuoteContent = resolvedQuoteContent.renderContent
		const renderQuoteContentHtml = resolvedQuoteContent.renderContentHtml

		const fallbackStyleDetailObj = {
			styleKey: IMAGE_STYLE_KEY_ARR[0],
			fontPath: resolveRuntimeFontPath(ctx, DEFAULT_SOURCE_HAN_SERIF_PATH),
			darkMode: true,
		}

		const defaultStyleDetailObj = config.imageStyleDetails.length > 0
			? config.imageStyleDetails[0]
			: fallbackStyleDetailObj
		let selectedStyleDetailObj = defaultStyleDetailObj
		if (options.imageStyleIdx !== undefined) {
			const isIdxValid = (options.imageStyleIdx as number) >= 0
				&& (options.imageStyleIdx as number) < config.imageStyleDetails.length
			if (!isIdxValid) {
				const idxInvalidMsgArr = [
					`❌ 图片样式索引不合法！`,
					``,
					`📊 合法范围：[0, ${config.imageStyleDetails.length - 1}]（双闭区间）`,
					`🔢 当前输入：${options.imageStyleIdx}`,
					``,
					`💡 小贴士：输入指令 \`${config.acsCommandName}\` 查看所有可用的图片样式列表 (*╹▽╹*) ✨`,
				]
				await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${idxInvalidMsgArr.join('\n')}`)
				waitingHintMsgId && await session.bot.deleteMessage(session.channelId, waitingHintMsgId)
				return
			}
			selectedStyleDetailObj = config.imageStyleDetails[options.imageStyleIdx as number]
		} else if (config.imageStyleDetails.length === 0) {
			const configErrMsg = `⚠️ 配置错误：图片样式列表为空，请联系管理员检查插件配置！ 🔧`
			await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${configErrMsg}`)
			ctx.logger.error(configErrMsg)
		}

		let selectedEnableDarkMode = selectedStyleDetailObj.darkMode
		if (options.enableDarkMode !== undefined) {
			if (options.enableDarkMode.toLowerCase() === 'true')
				selectedEnableDarkMode = true
			if (options.enableDarkMode.toLowerCase() === 'false')
				selectedEnableDarkMode = false
		}

		const sessionUserObj = await resolveQuoteUserProfile(session, quoteData, preUserObj)
		if (!sessionUserObj?.name || !sessionUserObj?.avatar) {
			const quoteUserInfoErrMsg = `❌ 未能获取被引用消息作者的用户名或头像，已停止渲染: userId=${quoteData.userId}, name=${sessionUserObj?.name || '(empty)'}, avatar=${sessionUserObj?.avatar || '(empty)'}`
			ctx.logger.error(quoteUserInfoErrMsg)
			await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}❌ 未能获取被引用消息作者的用户名或头像，已停止渲染。`)
			waitingHintMsgId && await session.bot.deleteMessage(session.channelId, waitingHintMsgId)
			return
		}

		const usernameArg = await resolveDisplayUsername(config, session, quoteData, sessionUserObj)
		const groupBadgeInfo = await resolveGroupBadgeInfo(ctx, config, session, options, quoteData, selectedStyleDetailObj.styleKey)

		let avatarBase64 = ''
		try {
			if (sessionUserObj.avatar) {
				avatarBase64 = await downloadAvatarBase64(ctx, sessionUserObj.avatar)
			}
		} catch (e: any) {
			const avatarErrMsg = `❌ 头像下载失败，无法继续渲染: ${e?.message || e}`
			ctx.logger.error(avatarErrMsg)
			await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}❌ 未能下载被引用消息作者的头像，已停止渲染。\n\n${avatarErrMsg}`)
			waitingHintMsgId && await session.bot.deleteMessage(session.channelId, waitingHintMsgId)
			return
		}

		const selectedFontPath = resolveRuntimeFontPath(ctx, selectedStyleDetailObj.fontPath)
		const fontResult = await fileToBase64WithFallback(ctx, PLUGIN_NAME, selectedFontPath)
		const fontBase64 = fontResult.fontBase64
		const fontUnicodeRange = isSourceHanSerifFontPath(fontResult.usedFontPath)
			? SOURCE_HAN_SERIF_CJK_UNICODE_RANGE
			: undefined
		const emojiFontPath = resolveRuntimeFontPath(ctx, config.emojiFontPath)
		const emojiFontBase64 = config.enableReleaseEmojiFont
			? await fileToBase64(ctx, PLUGIN_NAME, emojiFontPath)
			: ''
		if (fontResult.fallbackUsed) {
			const fallbackMsg = `⚠️ 字体读取失败，已 fallback 到默认字体: source=${selectedFontPath}, fallback=${fontResult.usedFontPath}, error=${fontResult.error}`
			if (config.verboseConsoleLog || options.verbose)
				ctx.logger.warn(fallbackMsg)
			if (config.verboseSessionLog || options.verbose)
				await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}⚠️ 字体读取失败，已使用默认字体继续渲染。\n\n${fallbackMsg}`)
		}

		const argMsgArr = [
			`🔍 参数信息`,
			`\t 选中的图片样式细节: ${JSON.stringify(selectedStyleDetailObj)}`,
			`\t 选中的是否黑暗模式: ${selectedEnableDarkMode}`,
			`\t 用户名：${usernameArg}`,
			`\t 引用消息内容：${quoteData.content.slice(0, 100)}...`,
			`\t 用户头像：${h.image(sessionUserObj.avatar)}`,
		]
		const argsMsg = argMsgArr.join('\n')

		if (config.verboseSessionLog || options.verbose)
			await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${argsMsg}`)
		if (config.verboseConsoleLog || options.verbose)
			ctx.logger.info(argsMsg)

		const res = await renderQuoteImage(
			ctx,
			{
				sentence: renderQuoteContent,
				username: usernameArg,
				userId: quoteData.userId,
				avatarBase64,
				sentenceHtml: renderQuoteContentHtml,
				width: config.imageWidth,
				minHeight: config.imageMinHeight,
				selectedStyle: selectedStyleDetailObj.styleKey,
				fontBase64,
				enableDarkMode: selectedEnableDarkMode,
				fontUnicodeRange,
				emojiFontBase64,
				inlineMediaAlign: config.inlineMediaAlign,
				imageType: config.imageType,
				enablePageScreenshotQuality: config.pageScreenshotQuality,
				verboseConsoleLog: config.verboseConsoleLog || options.verbose,
				showUserId: config.showUserId !== false,
				showTimestamp: config.showTimestamp !== false,
				preserveNewlines: options.newlines !== false,
				groupBadgeInfo,
			},
		)
		const renderElapsed = Date.now() - renderStartTime
		let imgMsg = `${config.enableQuote ? h.quote(session.messageId) : ''}${h.image(`data:image/${config.imageType};base64,${res}`)}`
		if (config.showRenderInfo) {
			imgMsg += `\n⏱️ 渲染耗时：${renderElapsed}ms | 样式：${selectedStyleDetailObj.styleKey}`
		}
		await session.send(imgMsg)

		waitingHintMsgId && await session.bot.deleteMessage(session.channelId, waitingHintMsgId)

		if (session.platform === 'qq' && config.enableQQMarkdown) {
			const md = buildQuoteMarkdown(quoteData.content, usernameArg)
			const kb = buildQuoteKeyboard(config, quoteData.userId, config.qqMarkdownKeyboardJson)
			await sendQQMarkdown(session, md, kb)
		}
	}
}
