import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import type { Context } from 'koishi'

const ASSETS_DIR = path.resolve(__dirname, '../assets')
const SOURCE_HAN_SERIF_PATH = path.join(ASSETS_DIR, 'SourceHanSerifSC-SemiBold.otf')
const LXGW_WENKAI_PATH = path.join(ASSETS_DIR, 'LXGWWenKaiMono-Regular.ttf')

export async function checkAndDownloadFonts(ctx: Context, pluginName: string) {
  const sourceHanSerifExists = existsSync(SOURCE_HAN_SERIF_PATH)
  const lxgwWenKaiExists = existsSync(LXGW_WENKAI_PATH)

  if (sourceHanSerifExists && lxgwWenKaiExists) {
    ctx.logger.info(`[${pluginName}] 字体文件已存在，跳过下载`)
    return true
  }

  ctx.logger.info(`[${pluginName}] 开始下载字体文件...`)

  try {
    await mkdir(ASSETS_DIR, { recursive: true })
  } catch (error) {
    ctx.logger.error(`[${pluginName}] 创建assets目录失败: ${error}`)
    return false
  }

  const downloadPromises: Promise<void>[] = []

  if (!sourceHanSerifExists) {
    ctx.logger.info(`[${pluginName}] 下载 SourceHanSerifSC-SemiBold.otf...`)
    downloadPromises.push(downloadFont(
      ctx,
      pluginName,
      'http://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/SourceHanSerifSC-SemiBold.otf',
      SOURCE_HAN_SERIF_PATH,
    ))
  }

  if (!lxgwWenKaiExists) {
    ctx.logger.info(`[${pluginName}] 下载 LXGWWenKaiMono-Regular.ttf...`)
    downloadPromises.push(downloadFont(
      ctx,
      pluginName,
      'http://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/LXGWWenKaiMono-Regular.ttf',
      LXGW_WENKAI_PATH,
    ))
  }

  try {
    await Promise.all(downloadPromises)
    ctx.logger.info(`[${pluginName}] 字体文件下载完成`)
    return true
  } catch (error) {
    ctx.logger.error(`[${pluginName}] 字体文件下载失败: ${error}`)
    return false
  }
}

export async function downloadFont(ctx: Context, pluginName: string, url: string, filePath: string): Promise<void> {
  const fileName = path.basename(filePath)

  try {
    ctx.logger.info(`[${pluginName}] 开始下载字体文件: ${fileName}`)
    const response = await ctx.http.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
    })
    await writeFile(filePath, Buffer.from(response))
    ctx.logger.info(`[${pluginName}] 字体文件下载成功: ${fileName} ✓`)
  } catch (error) {
    ctx.logger.error(`[${pluginName}] 字体文件下载失败 ${fileName}: ${error}`)
    throw error
  }
}

export async function fileToBase64(ctx: Context, pluginName: string, filePath: string): Promise<string> {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, filePath)
    const buffer = await readFile(absolutePath)
    return buffer.toString('base64')
  } catch (error) {
    ctx.logger.error(`[${pluginName}]文件转换成base64失败: ${error.message}`)
    throw error
  }
}
