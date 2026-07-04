import { Context } from 'koishi'

import { } from 'koishi-plugin-adapter-onebot'

import type { Config as AwaQuoteImageConfig } from './config'
import { Config as ConfigSchema } from './config'
import { registerAcsCommand } from './commands/acs'
import { registerAqtCommand } from './commands/aqt'
import { registerQQQuoteCacheMiddleware, setupQQQuoteCacheDatabase } from './qq'
import { checkAndDownloadFonts } from './utils'

export const inject = {
	required: ['puppeteer', 'http'],
	optional: ['database'],
}

export const name = 'awa-quote-image'
const PLUGIN_NAME = name

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
	registerQQQuoteCacheMiddleware(ctx, config, qqQuoteCacheRuntime)

	checkAndDownloadFonts(ctx, PLUGIN_NAME, config.enableReleaseEmojiFont).catch((error) => {
		ctx.logger.warn(`⚠️ apply 阶段字体预检查失败，将在指令执行时重试: ${error?.message || error}`)
	})

	registerAcsCommand(ctx, config)
	registerAqtCommand(ctx, config, qqQuoteCacheRuntime)
}
