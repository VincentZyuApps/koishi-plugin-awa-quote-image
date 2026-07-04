import { Schema } from 'koishi'

import { IMAGE_STYLES, ImageStyleKey, IMAGE_STYLE_KEY_ARR, IMAGE_TYPES, ImageType, INLINE_MEDIA_ALIGNS, InlineMediaAlign } from './types'
import { stringifyCompact, DEFAULT_KEYBOARD_ROWS } from './qq'
import { DEFAULT_LXGW_WENKAI_PATH, DEFAULT_SOURCE_HAN_SERIF_PATH, DEFAULT_TWEMOJI_COLR_PATH } from './utils'

export interface ImageStyleDetail {
	styleKey: ImageStyleKey // 🖌️ 图片渲染样式 key
	fontPath: string // 📁 字体文件路径
	darkMode: boolean // 🌙 是否启用深色模式
}

export interface Config {
	// ===== 📌 基础配置 =====
	acsCommandName: string // 📋 acs 指令名称 —— 查看图片样式列表
	aqtCommandName: string // 🎨 aqt 指令名称 —— 制作名人名言图片

	// ===== 💬 会话设置 =====
	enableQuote: boolean // 💬 是否引用触发指令的消息
	enableWaitingHint: boolean // ⏳ 是否显示「渲染中，请等待...」提示
	inlineMediaAlign: InlineMediaAlign // 🧲 引用消息内联图片/表情与文字的垂直对齐方式
	atRenderMode: 'none' | 'nick' | 'username' // 🎯 引用消息 @ 段渲染方式
	nameStyle: 'name-only' | 'card-only' | 'name-card' | 'card-name' // 🎭 用户名显示样式
	showUserId: boolean // 🆔 是否在图片中显示用户 ID
	showTimestamp: boolean // 🕐 是否在图片中显示时间戳
	showGroupTitleInQqBubble: boolean // 🏷️ 是否在 QQ气泡样式中显示群头衔（仅OneBot 平台且使用 QQ气泡样式时生效）

	// ===== 🖼️ 图片渲染配置 =====
	imageStyleDetails: ImageStyleDetail[] // 🖼️ 图片样式细节列表（table 配置）
	imageWidth: number // 📐 渲染图片宽度
	imageMinHeight: number // 📏 渲染图片最小高度
	imageType: ImageType // 📤 输出图片类型
	pageScreenshotQuality: number // 🎚️ 截图质量参数
	showRenderInfo: boolean // ⏱️ 是否在图片后显示渲染耗时信息
	enableReleaseEmojiFont: boolean // 😀 是否使用插件从 release 下载的 emoji 字体
	emojiFontPath: string // 📁 emoji 字体文件路径

	// ===== 🤖 QQ 官方 Bot 平台设置 =====
	enableQQMarkdown: boolean // 💬 在 QQ 官方 Bot 平台发送图片时附带 Markdown + 按钮
	qqMarkdownKeyboardJson: string // 📋 QQ Markdown 按钮 JSON 配置
	qqQuoteCacheMode: 'database' | 'memory' // 🧠 QQ 引用消息缓存模式
	qqQuoteCacheLimitPerChannelid: number // 📦 每个 channel_id 的 QQ 引用缓存条数上限
	qqBotAppId: string // 🤖 QQ 官方 Bot 的 AppId（用于 qqapp 头像地址，如 102800160）
	botUid?: string // @deprecated 旧配置里可能存在的 Bot QQ 号，用于 Bot 自身头像

	// ===== 🐛 调试设置 =====
	verboseSessionLog: boolean // 🐛 是否在会话中输出调试信息
	verboseConsoleLog: boolean // 🐛 是否在控制台输出调试信息
}

export const Config: Schema<Config> = Schema.intersect([
	// ===== 📌 基础配置 =====
	Schema.object({
		acsCommandName: Schema
			.string()
			.default('名人名言图片样式列表')
			.description('📋 acs 指令名称 —— 查看图片样式列表'),
		aqtCommandName: Schema
			.string()
			.default('名人名言')
			.description('🎨 aqt 指令名称 —— 制作名人名言图片'),
	}).description('📌 基础配置 ⚙️'),

	// ===== 💬 会话设置 =====
	Schema.object({
		enableQuote: Schema
			.boolean()
			.default(true)
			.description('💬 bot 发送消息时，是否引用触发消息的指令'),
		enableWaitingHint: Schema
			.boolean()
			.default(true)
			.description('⏳ 是否启用「渲染中，请等待...」提示消息'),
		inlineMediaAlign: Schema
			.union([
				Schema.const(INLINE_MEDIA_ALIGNS.TOP).description('⬆️ 顶部对齐'),
				Schema.const(INLINE_MEDIA_ALIGNS.MIDDLE).description('↕️ 中部对齐'),
				Schema.const(INLINE_MEDIA_ALIGNS.BOTTOM).description('⬇️ 底部对齐（默认）'),
			])
			.role('radio')
			.default(INLINE_MEDIA_ALIGNS.BOTTOM)
			.description('🧲 引用消息中图片 / 表情与文字的垂直对齐方式'),
		atRenderMode: Schema
			.union([
				Schema.const('none').description('🚫 不渲染 @ 消息段'),
				Schema.const('nick').description('🪪 渲染群昵称 / 群名片'),
				Schema.const('username').description('🏷️ 渲染用户名'),
			])
			.role('radio')
			.default('nick')
			.description('🎯 引用消息中的 @ 消息段渲染方式'),
		nameStyle: Schema
			.union([
				Schema.const('name-only').description('🏷️ 只显示用户名'),
				Schema.const('card-only').description('🪪 只显示群名片'),
				Schema.const('name-card').description('🏷️🪪 用户名（群名片）'),
				Schema.const('card-name').description('🪪🏷️ 群名片（用户名）'),
			])
			.role('radio')
			.default('name-card')
			.description('🎭 用户名显示样式 <br/> <i>群名片需要平台支持群成员资料查询；不支持时会显示用户名。</i>'),
		showUserId: Schema
			.boolean()
			.default(true)
			.description('🆔 是否在图片中显示用户 ID —— **强烈建议保持开启**，防止换名换头像伪造聊天记录，关闭后果自负，与作者无关 ⚠️'),
		showTimestamp: Schema
			.boolean()
			.default(true)
			.description('🕐 是否在图片中显示时间戳 —— **强烈建议保持开启**，防止篡改时间伪造聊天记录，关闭后果自负，与作者无关 ⚠️'),
		showGroupTitleInQqBubble: Schema
			.boolean()
			.default(true)
			.description('🏷️ 是否在QQ 气泡样式中显示群头衔和群等级（仅OneBot平台 且 使用QQ气泡样式时生效）'),
	}).description('💬 会话设置 ⚙️'),

	// ===== 🖼️ 图片渲染配置 =====
	Schema.object({
		imageStyleDetails: Schema
			.array(
				Schema.object({
					styleKey: Schema
						.union(IMAGE_STYLE_KEY_ARR.map((key) => Schema.const(key).description(`🖌️ ${IMAGE_STYLES[key]}`)))
						.role('radio')
						.description('🖌️ 图片样式'),
					fontPath: Schema
						.string()
						.description('📁 字体文件路径'),
					darkMode: Schema
						.boolean()
						.description('🌙 启用深色模式'),
				})
			)
			.role('table')
			.default([
				{
					styleKey: IMAGE_STYLE_KEY_ARR[0],
					fontPath: DEFAULT_SOURCE_HAN_SERIF_PATH,
					darkMode: false,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[0],
					fontPath: DEFAULT_SOURCE_HAN_SERIF_PATH,
					darkMode: true,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[1],
					fontPath: DEFAULT_SOURCE_HAN_SERIF_PATH,
					darkMode: false,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[1],
					fontPath: DEFAULT_SOURCE_HAN_SERIF_PATH,
					darkMode: true,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[2],
					fontPath: DEFAULT_LXGW_WENKAI_PATH,
					darkMode: false,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[2],
					fontPath: DEFAULT_LXGW_WENKAI_PATH,
					darkMode: true,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[3],
					fontPath: DEFAULT_LXGW_WENKAI_PATH,
					darkMode: false,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[3],
					fontPath: DEFAULT_LXGW_WENKAI_PATH,
					darkMode: true,
				},
			])
			.description('🎨 图片样式列表 —— 第一行为默认配置，其余可用 aqt -i 索引指定'),
		imageWidth: Schema
			.number()
			.default(1920)
			.description('📐 默认图片宽度（px）'),
		imageMinHeight: Schema
			.number()
			.default(1080)
			.description('📏 默认最小图片高度（px）'),
		imageType: Schema.union([
			Schema.const(IMAGE_TYPES.PNG).description(`🖼️ ${IMAGE_TYPES.PNG}, ❌ 不支持调整 quality`),
			Schema.const(IMAGE_TYPES.JPEG).description(`🌄 ${IMAGE_TYPES.JPEG}, ✅ 支持调整 quality`),
			Schema.const(IMAGE_TYPES.WEBP).description(`🌐 ${IMAGE_TYPES.WEBP}, ✅ 支持调整 quality`),
		])
			.role('radio')
			.default(IMAGE_TYPES.PNG)
			.description('📤 渲染图片的输出格式'),
		pageScreenshotQuality: Schema
			.number()
			.role('slider')
			.min(0).max(100).step(0.1)
			.default(60)
			.description('🎚️ Puppeteer 截图质量 [0-100]，对 PNG 无效'),
		showRenderInfo: Schema
			.boolean()
			.default(false)
			.description('⏱️ 发送图片时附渲染耗时信息<br><i>仅在消息末尾追加一行文字，不影响图片本身</i>'),
		enableReleaseEmojiFont: Schema
			.boolean()
			.experimental()
			.default(false)
			.description('😀 是否使用插件从 Gitee/GitHub release 下载的 Twemoji 彩色 emoji 字体<br><i>开启：下载并校验 TwemojiCOLRv0.ttf 后注入渲染 CSS；关闭：不下载、不注入，使用系统 emoji 字体 fallback。</i> <br><i>⚠️ 实验性功能，可能不稳定；生产环境更建议关闭 enableReleaseEmojiFont，使用系统 emoji 字体。</i>'),
		emojiFontPath: Schema
			.string()
			.experimental()
			.role('textarea', { rows: [2, 5] })
			.default(DEFAULT_TWEMOJI_COLR_PATH)
			.description('📁 TwemojiCOLRv0.ttf 字体文件路径<br><i>默认展示 process.cwd()/data/fonts/TwemojiCOLRv0.ttf；运行时自动映射到 ctx.baseDir/data/fonts/TwemojiCOLRv0.ttf。</i>')
	}).description('🖼️ 图片渲染配置'),

	// ===== 🤖 QQ 官方 Bot 平台设置 =====
	Schema.object({
		enableQQMarkdown: Schema
			.boolean()
			.default(true)
			.description('💬 在 QQ 官方 Bot 平台发送图片时附带 Markdown + 按钮消息'),
		qqMarkdownKeyboardJson: Schema
			.string()
			.role('textarea', { rows: [5, 10] })
			.default(stringifyCompact(DEFAULT_KEYBOARD_ROWS))
			.description('📋 QQ Markdown 按钮 JSON 配置<br><em>支持变量: <code>${aqtCommandName}</code> <code>${acsCommandName}</code> <code>${userId}</code></em>'),
		qqQuoteCacheMode: Schema
			.union([
				Schema.const('database').description('💾 磁盘缓存（推荐，需要 database 服务）'),
				Schema.const('memory').description('🧠 内存缓存（重启后清空）'),
			])
			.experimental()
			.role('radio')
			.default('database')
			.description('🧠 QQ 引用消息缓存模式<br><i>磁盘模式使用 database 服务保存 REFIDX 映射，重启后仍可命中；如果未启用 database，会自动退回内存模式。</i>'),
		qqQuoteCacheLimitPerChannelid: Schema
			.number()
			.experimental()
			.min(10).max(1000000).step(10)
			.default(500)
			.description('📦 每个 channel_id 的 QQ 引用缓存条数上限<br><i>内存缓存和 database 缓存都会按 channel_id 分桶裁剪。</i>'),
		qqBotAppId: Schema
			.string()
			.experimental()
			.default('')
			.description('🤖 QQ 官方 Bot 的 AppId（用于拼接 qqapp 头像地址）<br><i>留空则自动从 bot.config.id 获取</i>'),
	}).description('🤖 QQ 官方 Bot 平台设置'),

	// ===== 🐛 调试设置 =====
	Schema.object({
		verboseSessionLog: Schema
			.boolean()
			.default(false)
			.description('🐛 在会话中输出详细参数信息<br><i>生产环境别开，东西很多，影响用户体验</i>'),
		verboseConsoleLog: Schema
			.boolean()
			.default(false)
			.description('🐛 在控制台输出详细参数信息<br><i>生产环境别开，东西很多，影响用户体验</i>'),
	}).description('🐛 调试设置 🔧')
])
