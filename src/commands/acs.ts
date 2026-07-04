import type { Context } from 'koishi'
import type { Config } from '../config'
import { IMAGE_STYLES, IMAGE_STYLE_KEY_ARR } from '../types'

export function registerAcsCommand(ctx: Context, config: Config) {
	ctx.command(
		config.acsCommandName,
		'名人名言图片样式列表',
	)
		.alias('acs')
		.action(async ({ session }) => {
			let msg = `🎨 **名人名言图片样式列表** 📋\n\n`
			msg += `💡 使用方式：\`${config.aqtCommandName} -i <索引号> [-dark true/false]\`\n\n`
			for (let i = 0; i < config.imageStyleDetails.length; i++) {
				const o = config.imageStyleDetails[i]
				const styleIcon = o.styleKey === IMAGE_STYLE_KEY_ARR[3] ? '💬' : '🖼️'
				const modeIcon = o.darkMode ? '🌙' : '☀️'
				msg += `${styleIcon} 【${i}】 ${modeIcon} ${IMAGE_STYLES[o.styleKey]} ${o.darkMode ? '(深色)' : '(浅色)'}\n`
			}
			msg += `\n✨ 默认使用第 0 个样式，可通过 -i 参数指定其他样式`
			await session.send(msg)
		})
}
