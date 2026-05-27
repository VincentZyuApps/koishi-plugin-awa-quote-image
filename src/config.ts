import { Schema } from 'koishi'
import path from 'path'

import { IMAGE_STYLES, ImageStyleKey, IMAGE_STYLE_KEY_ARR, IMAGE_TYPES, ImageType } from './type'

export interface ImageStyleDetail {
	/** 🖌️ 图片渲染样式 key */
	styleKey: ImageStyleKey
	/** 📁 字体文件路径 */
	fontPath: string
	/** 🌙 是否启用深色模式 */
	darkMode: boolean
}

export interface Config {
	/** 📋 acs 指令名称 —— 查看图片样式列表 */
	acsCommandName: string
	/** 🎨 aqt 指令名称 —— 制作名人名言图片 */
	aqtCommandName: string

	/** 🎭 Onebot 平台用户名显示样式 */
	onebotNameStyle: 'name-only' | 'card-only' | 'name-card' | 'card-name'
	/** 🆔 是否在图片中显示用户 ID */
	showUserId: boolean
	/** 🕐 是否在图片中显示时间戳 */
	showTimestamp: boolean
	/** 💬 是否引用触发指令的消息 */
	enableQuote: boolean
	/** ⏳ 是否显示「渲染中，请等待...」提示 */
	enableWatingHint: boolean

	/** 🖼️ 图片样式细节列表（table 配置） */
	imageStyleDetails: ImageStyleDetail[]
	/** 📐 渲染图片宽度 */
	imageWidth: number
	/** 📏 渲染图片最小高度 */
	imageMinHeight: number
	/** 📤 输出图片类型 */
	imageType: ImageType
	/** 🎚️ 截图质量参数 */
	pageScreenshotQuality: number

	/** 🐛 是否在会话中输出调试信息 */
	verboseSessionLog: boolean
	/** 🐛 是否在控制台输出调试信息 */
	verboseConsoleLog: boolean

	/** 🏷️ 是否在 QQ气泡样式中显示群头衔（仅OneBot 平台且使用 QQ气泡样式时生效）*/
	showGroupTitleInQqBubble: boolean
}

export const Config: Schema<Config> = Schema.intersect([
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

	Schema.object({
		onebotNameStyle: Schema
			.union([
				Schema.const('name-only').description('🏷️ 只显示用户名'),
				Schema.const('card-only').description('🪪 只显示群卡片【仅onebot】'),
				Schema.const('name-card').description('🏷️🪪 用户名（群卡片）【仅onebot】'),
				Schema.const('card-name').description('🪪🏷️ 群卡片（用户名）【仅onebot】'),
			])
			.role('radio')
			.default('name-card')
			.description('🎭 Onebot 平台用户名显示样式 <br/> <i>（仅对Onebot平台生效，非 Onebot 平台始终显示用户名）</i>'),
		showUserId: Schema
			.boolean()
			.default(true)
			.description('🆔 是否在图片中显示用户 ID —— **强烈建议保持开启**，防止换名换头像伪造聊天记录，关闭后果自负，与作者无关 ⚠️'),
		showTimestamp: Schema
			.boolean()
			.default(true)
			.description('🕐 是否在图片中显示时间戳 —— **强烈建议保持开启**，防止篡改时间伪造聊天记录，关闭后果自负，与作者无关 ⚠️'),
		enableQuote: Schema
			.boolean()
			.default(true)
			.description('💬 bot 发送消息时，是否引用触发消息的指令'),
		enableWatingHint: Schema
			.boolean()
			.default(true)
			.description('⏳ 是否启用「渲染中，请等待...」提示消息'),
		showGroupTitleInQqBubble: Schema
			.boolean()
			.default(true)
			.description('🏷️ 是否在QQ 气泡样式中显示群头衔和群等级（仅OneBot平台 且 使用QQ气泡样式时生效）'),
	}).description('💬 会话设置 ⚙️'),

	Schema.object({
		imageStyleDetails: Schema
			.array(
				Schema.object({
					styleKey: Schema
						.union(IMAGE_STYLE_KEY_ARR.map((key) => Schema.const(key).description(IMAGE_STYLES[key])))
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
					fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
					darkMode: false,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[0],
					fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
					darkMode: true,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[1],
					fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
					darkMode: false,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[1],
					fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
					darkMode: true,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[2],
					fontPath: path.resolve(__dirname, '../assets/LXGWWenKaiMono-Regular.ttf'),
					darkMode: false,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[2],
					fontPath: path.resolve(__dirname, '../assets/LXGWWenKaiMono-Regular.ttf'),
					darkMode: true,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[3],
					fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
					darkMode: false,
				},
				{
					styleKey: IMAGE_STYLE_KEY_ARR[3],
					fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
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
			.description('🎚️ Puppeteer 截图质量 [0-100]，对 PNG 无效')
	}).description('🖼️ 图片渲染配置'),

	Schema.object({
		verboseSessionLog: Schema
			.boolean()
			.default(false)
			.description('🐛 在会话中输出详细参数信息'),
		verboseConsoleLog: Schema
			.boolean()
			.default(false)
			.description('🐛 在控制台输出详细参数信息'),
	}).description('🐛 调试设置 🔧')
])
