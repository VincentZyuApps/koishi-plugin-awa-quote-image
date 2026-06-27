import { Context, h } from 'koishi'

import { } from 'koishi-plugin-adapter-onebot';

import type { Config as AwaQuoteImageConfig } from './config';
import { Config as ConfigSchema } from './config';
import { renderQuoteImage } from './render';
import { IMAGE_STYLES, IMAGE_STYLE_KEY_ARR } from './type';
import { DEFAULT_SOURCE_HAN_SERIF_PATH, checkAndDownloadFonts, fileToBase64WithFallback, resolveRuntimeFontPath } from './utils';
import { buildQuoteMarkdown, buildQuoteKeyboard, sendQQMarkdown, resolveQQData, registerQQQuoteCacheMiddleware, setupQQQuoteCacheDatabase } from './qq';

export const inject = {
	required: ["puppeteer", "http"],
	optional: ["database"],
};

export const name = 'awa-quote-image';
const PLUGIN_NAME = name;

export { usage } from './usage'
export const Config = ConfigSchema

export function apply(ctx: Context, config: AwaQuoteImageConfig) {
	let databaseCtx: Context | null = null
	const qqQuoteCacheRuntime = {
		getDatabaseContext: () => databaseCtx,
	}

	if (config.qqQuoteCacheMode === 'database') {
		ctx.inject(['database'], (ctx) => {
			databaseCtx = ctx
			setupQQQuoteCacheDatabase(ctx, config)
			ctx.on('dispose', () => {
				if (databaseCtx === ctx) databaseCtx = null
			})
		})
	}
	registerQQQuoteCacheMiddleware(ctx, config, qqQuoteCacheRuntime);

	// 立即注册 acs 指令
	ctx.command(
		config.acsCommandName,
		"名人名言图片样式列表"
	)
		.alias("acs")
		.action(async ({ session }) => {
			let msg = `🎨 **名人名言图片样式列表** 📋\n\n`;
			msg += `💡 使用方式：\`${config.aqtCommandName} -i <索引号> [-dark true/false]\`\n\n`;
			for (let i = 0; i < config.imageStyleDetails.length; i++) {
				const o = config.imageStyleDetails[i];
				const styleIcon = o.styleKey === IMAGE_STYLE_KEY_ARR[3] ? '💬' : '🖼️';
				const modeIcon = o.darkMode ? '🌙' : '☀️';
				msg += `${styleIcon} 【${i}】 ${modeIcon} ${IMAGE_STYLES[o.styleKey]} ${o.darkMode ? '(深色)' : '(浅色)'}\n`;
			}
			msg += `\n✨ 默认使用第 0 个样式，可通过 -i 参数指定其他样式`;
			await session.send(msg);
		});

	// 立即注册 aqt 指令；字体在执行时检查，避免异步下载完成后才注册命令。
	ctx.command(
		config.aqtCommandName + ' [text:text]',
		"回复/引用某个群u说的话, 制作名人名言图片"
	)
		.alias("aqt")
		.option("imageStyleIdx", "-i, --idx, --index <idx:number> 图片样式索引")
		.option("enableDarkMode", "-d, --dark, --darkmode <enableDarkMode:string> 启用深色模式")
		.option("newlines", "--newlines, --no-newlines 是否保留原始消息换行（默认开启）")
		.option("verbose", "-v, --verbose 在session和console打印详细参数信息")
		.action(async ({ session, options }) => {
			try {
				const fontsReady = await checkAndDownloadFonts(ctx, PLUGIN_NAME);
				if (!fontsReady) {
					ctx.logger.error(`[${PLUGIN_NAME}] 字体下载失败，将尝试使用已有字体或默认字体继续渲染`);
				}

				await do_aqt({ session, options });
			} catch (error) {
				let errorMsg = `❌ 渲染名人名言图片失败！\n\n🔍 错误信息：${error}\n\n💡 如果问题持续，请联系管理员或查看控制台日志 📝`;
				if (config.verboseSessionLog || options.verbose)
					await session.send(errorMsg);
				if (config.verboseConsoleLog || options.verbose)
					ctx.logger.error(errorMsg);
			}
		});
	ctx.logger.info(`[${PLUGIN_NAME}] aqt 指令注册完成`);

	async function do_aqt({ session, options }) {
		const isVerbose = config.verboseConsoleLog || options.verbose
		if (isVerbose) ctx.logger.info(`[${PLUGIN_NAME}] do_aqt: platform=${session.platform}, hasQuote=${!!session.quote}, quoteContent=${!!session.quote?.content}`)

		let quoteData: { content: string; userId: string; guildId: string }
		let preUserObj: { name: string; avatar: string } | null = null

		// Priority 1: QQ 官方 / qq-crack 专用解析。
		// QQ 平台不能把作者 fallback 到触发者，否则不同人引用时头像和昵称会错。
		if (session.platform === 'qq') {
			if (isVerbose) ctx.logger.info(`[${PLUGIN_NAME}] do_aqt: 走 Priority 1 resolveQQData`)
			const qq = await resolveQQData(session, options, ctx, config, qqQuoteCacheRuntime)
			if (!qq) {
				const quoteAuthorErrMsg = `[${PLUGIN_NAME}] QQ 平台未能获取被引用消息作者的完整信息（content/userId/username/avatar），已停止渲染，不会使用触发 aqt 的用户信息。`
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
					ctx.logger.error(`[${PLUGIN_NAME}] QQ Markdown 错误提示发送失败: ${error?.message || error}`)
					await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}❌ QQ 平台未能获取被引用消息的作者头像和用户名，已停止渲染。\n\n不会使用触发 aqt 指令的人的头像或用户名。\n\n请确认引用的是机器人在线期间可查询到的群消息，或使用 -v 查看控制台里的 QQ 原始事件。`)
				}
				return
			}
			quoteData = qq
			preUserObj = qq.username ? { name: qq.username, avatar: qq.avatar } : null
		// Priority 2: session.quote 有内容（OneBot + crack适配器缓存命中）
		} else if (session.quote?.content) {
			if (isVerbose) ctx.logger.info(`[${PLUGIN_NAME}] do_aqt: 走 Priority 1 session.quote`)
			if (!session.quote.user?.id) {
				const quoteUserIdErrMsg = `[${PLUGIN_NAME}] 未能获取被引用消息的作者 ID，已停止渲染。`
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
			if (isVerbose) ctx.logger.info(`[${PLUGIN_NAME}] do_aqt: 无引用内容，报错`)
			await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}💬 请先回复或引用一条消息，我才能帮你制作名人名言图片哦~ 📝`);
			return;
		}

		await renderAndSend({ session, options, quoteData, preUserObj })
	}

	async function renderAndSend({ session, options, quoteData, preUserObj = null }) {
		const renderStartTime = Date.now()
		const waitingHintMsgId = config.enableWatingHint
			? (await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}🎨 正在渲染名人名言图片，请稍候... ⏳`))[0]
			: null;

		const FALLBACK_STYLE_DETAIL_OBJ = {
			styleKey: IMAGE_STYLE_KEY_ARR[0],
			fontPath: resolveRuntimeFontPath(ctx, DEFAULT_SOURCE_HAN_SERIF_PATH),
			darkMode: true,
		}

		const defaultStyleDetailObj = config.imageStyleDetails.length > 0 ?
			config.imageStyleDetails[0] :
			FALLBACK_STYLE_DETAIL_OBJ;
		let selectedStyleDetailObj = defaultStyleDetailObj;
		if (options.imageStyleIdx !== undefined) {
			const isIdxValid: boolean = (options.imageStyleIdx as number) >= 0
				&& (options.imageStyleIdx as number) < config.imageStyleDetails.length;
			if (!isIdxValid) {
				let idxInvalidMsgArr = [
					`❌ 图片样式索引不合法！`,
					``,
					`📊 合法范围：[0, ${config.imageStyleDetails.length - 1}]（双闭区间）`,
					`🔢 当前输入：${options.imageStyleIdx}`,
					``,
					`💡 小贴士：输入指令 \`${config.acsCommandName}\` 查看所有可用的图片样式列表 (*╹▽╹*) ✨`
				];
				await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${idxInvalidMsgArr.join('\n')}`);
				waitingHintMsgId && await session.bot.deleteMessage(session.channelId, waitingHintMsgId);
				return;
			}
			selectedStyleDetailObj = config.imageStyleDetails[options.imageStyleIdx as number];
		} else {
			if (config.imageStyleDetails.length === 0) {
				let configErrMsg = `⚠️ ${PLUGIN_NAME} 配置错误：图片样式列表为空，请联系管理员检查插件配置！ 🔧`;
				await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${configErrMsg}`);
				ctx.logger.error(configErrMsg);
			}
		}

		let selectedEnableDarkMode = selectedStyleDetailObj.darkMode;
		if (options.enableDarkMode !== undefined) {
			if (options.enableDarkMode.toLowerCase() === 'true')
				selectedEnableDarkMode = true;
			if (options.enableDarkMode.toLowerCase() === 'false')
				selectedEnableDarkMode = false;
		}

		const session_user_obj = preUserObj ?? (
			typeof session.bot.getUser === 'function'
				? await session.bot.getUser(quoteData.userId, session.channelId)
				: { name: quoteData.userId, avatar: '' }
		);
		if (!session_user_obj?.name || !session_user_obj?.avatar) {
			const quoteUserInfoErrMsg = `[${PLUGIN_NAME}] 未能获取被引用消息作者的用户名或头像，已停止渲染: userId=${quoteData.userId}, name=${session_user_obj?.name || '(empty)'}, avatar=${session_user_obj?.avatar || '(empty)'}`
			ctx.logger.error(quoteUserInfoErrMsg)
			await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}❌ 未能获取被引用消息作者的用户名或头像，已停止渲染。`)
			waitingHintMsgId && await session.bot.deleteMessage(session.channelId, waitingHintMsgId);
			return
		}
		let usernameArg = session_user_obj?.name || quoteData.userId;
		if (config.onebotNameStyle !== 'name-only' && session.onebot) {
			const onebot_groupmember_obj = await session.onebot.getGroupMemberInfo(quoteData.guildId, quoteData.userId);
			const onebot_groupcard = onebot_groupmember_obj.card;
			if (onebot_groupcard && onebot_groupcard.length > 0) {
				switch (config.onebotNameStyle) {
					case 'card-only':
						usernameArg = onebot_groupcard;
						break;
					case 'name-card':
						usernameArg = `${session_user_obj.name}（${onebot_groupcard}）`;
						break;
					case 'card-name':
						usernameArg = `${onebot_groupcard}（${session_user_obj.name}）`;
						break;
				}
			}
		}

	let groupBadgeInfo: { levelText: string; titleText?: string; color: string; bgColor: string } | undefined = undefined;

		const isQqBubbleStyle = selectedStyleDetailObj.styleKey === IMAGE_STYLE_KEY_ARR[3];

	if (session.onebot && isQqBubbleStyle && config.showGroupTitleInQqBubble) {
		try {
			const memberInfo = await session.onebot.getGroupMemberInfo(
				quoteData.guildId,
				quoteData.userId
			);

			const role = memberInfo.role;
			const customTitle = memberInfo.title;
			const level = memberInfo.level;

			const levelText = `LV${level}`;

			let titleText: string | undefined = undefined;
			let color: string;
			let bgColor: string;

			if (role === 'owner') {
				titleText = customTitle || '群主';
				color = '#FF8C00';
				bgColor = 'rgba(255, 140, 0, 0.15)';
			} else if (role === 'admin') {
				titleText = customTitle || '管理员';
				color = '#1E90FF';
				bgColor = 'rgba(30, 144, 255, 0.15)';
			} else if (customTitle && customTitle.length > 0) {
				titleText = customTitle;
				color = '#9370DB';
				bgColor = 'rgba(147, 112, 219, 0.15)';
			} else {
				titleText = undefined;
				color = '#888888';
				bgColor = 'rgba(136, 136, 136, 0.15)';
			}

			groupBadgeInfo = {
				levelText,
				titleText,
				color,
				bgColor
			};

			if (config.verboseConsoleLog || options.verbose) {
				ctx.logger.info(`[${PLUGIN_NAME}] 群徽章信息: ${JSON.stringify({
					role,
					customTitle,
					level,
					groupBadgeInfo
				})}`);
			}
		} catch (error: any) {
			ctx.logger.warn(`[${PLUGIN_NAME}] 获取群成员信息失败: ${error.message}`);
		}
	}

		let avatar_base64 = ''
		try {
			if (session_user_obj.avatar) {
				const avatar_buffer = await ctx.http.file(session_user_obj.avatar)
				avatar_base64 = Buffer.from(avatar_buffer.data).toString('base64')
			}
		} catch (e: any) {
			const avatarErrMsg = `[${PLUGIN_NAME}] 头像下载失败，无法继续渲染: ${e?.message || e}`
			ctx.logger.error(avatarErrMsg)
			await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}❌ 未能下载被引用消息作者的头像，已停止渲染。\n\n${avatarErrMsg}`)
			waitingHintMsgId && await session.bot.deleteMessage(session.channelId, waitingHintMsgId);
			return
		}
		const selectedFontPath = resolveRuntimeFontPath(ctx, selectedStyleDetailObj.fontPath);
		const fontResult = await fileToBase64WithFallback(ctx, PLUGIN_NAME, selectedFontPath);
		const font_base64 = fontResult.fontBase64;
		if (fontResult.fallbackUsed) {
			const fallbackMsg = `[${PLUGIN_NAME}] 字体读取失败，已 fallback 到默认字体: source=${selectedFontPath}, fallback=${fontResult.usedFontPath}, error=${fontResult.error}`;
			if (config.verboseConsoleLog || options.verbose)
				ctx.logger.warn(fallbackMsg);
			if (config.verboseSessionLog || options.verbose)
				await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}⚠️ 字体读取失败，已使用默认字体继续渲染。\n\n${fallbackMsg}`);
		}

		const argMsgArr = [
			`${config.enableQuote ? h.quote(session.messageId) : ''}${PLUGIN_NAME} 参数信息`,
			`\t 选中的图片样式细节: ${JSON.stringify(selectedStyleDetailObj)}`,
			`\t 选中的是否黑暗模式: ${selectedEnableDarkMode}`,
			`\t 用户名：${usernameArg}`,
			`\t 引用消息内容：${quoteData.content.slice(0, 100)}...`,
			`\t 用户头像：${h.image(session_user_obj.avatar)}`,
		];
		const argsMsg = argMsgArr.join('\n');

		if (config.verboseSessionLog || options.verbose)
			await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${argsMsg}`);
		if (config.verboseConsoleLog || options.verbose)
			ctx.logger.info(argsMsg);

		const res = await renderQuoteImage(
			ctx,
			{
				sentence: quoteData.content, username: usernameArg, userId: quoteData.userId, avatarBase64: avatar_base64,
				width: config.imageWidth, minHeight: config.imageMinHeight,
				selectedStyle: selectedStyleDetailObj.styleKey, fontBase64: font_base64, enableDarkMode: selectedEnableDarkMode,
				imageType: config.imageType, enablePageScreenshotQuality: config.pageScreenshotQuality,
				showUserId: config.showUserId !== false, showTimestamp: config.showTimestamp !== false,
				preserveNewlines: options.newlines !== false,
				groupBadgeInfo: groupBadgeInfo,
			}
		);
		const renderElapsed = Date.now() - renderStartTime
		let imgMsg = `${config.enableQuote ? h.quote(session.messageId) : ''}${h.image(`data:image/${config.imageType};base64,${res}`)}`
		if (config.showRenderInfo) {
			imgMsg += `\n⏱️ 渲染耗时：${renderElapsed}ms | 样式：${selectedStyleDetailObj.styleKey}`
		}
		await session.send(imgMsg)

		waitingHintMsgId && await session.bot.deleteMessage(session.channelId, waitingHintMsgId);

		if (session.platform === 'qq' && config.enableQQMarkdown) {
			const md = buildQuoteMarkdown(quoteData.content, usernameArg)
			const kb = buildQuoteKeyboard(config, quoteData.userId, config.qqMarkdownKeyboardJson)
			await sendQQMarkdown(session, md, kb)
		}
	}
}
