import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import type { Context } from 'koishi'

export const SOURCE_HAN_SERIF_FILE_NAME = 'SourceHanSerifSC-SemiBold.otf'
export const LXGW_WENKAI_FILE_NAME = 'LXGWWenKaiMono-Regular.ttf'

export const SOURCE_HAN_SERIF_URL = 'http://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/SourceHanSerifSC-SemiBold.otf'
export const LXGW_WENKAI_URL = 'http://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/LXGWWenKaiMono-Regular.ttf'

export function getFontDirByBaseDir(baseDir: string) {
  return path.join(baseDir, 'data', 'fonts')
}

export function getSourceHanSerifPathByBaseDir(baseDir: string) {
  return path.join(getFontDirByBaseDir(baseDir), SOURCE_HAN_SERIF_FILE_NAME)
}

export function getLxgwWenKaiPathByBaseDir(baseDir: string) {
  return path.join(getFontDirByBaseDir(baseDir), LXGW_WENKAI_FILE_NAME)
}

// Schema 默认值无法拿到 ctx.baseDir，只能用 cwd 作为展示 fallback。
// 运行时必须优先使用 ctx.baseDir，见 resolveRuntimeFontPath()。
export const DEFAULT_SOURCE_HAN_SERIF_PATH = getSourceHanSerifPathByBaseDir(process.cwd())
export const DEFAULT_LXGW_WENKAI_PATH = getLxgwWenKaiPathByBaseDir(process.cwd())

export function resolveRuntimeFontPath(ctx: Context, filePath: string): string {
  const sourceHanSerifPath = getSourceHanSerifPathByBaseDir(ctx.baseDir)
  const lxgwWenKaiPath = getLxgwWenKaiPathByBaseDir(ctx.baseDir)

  if (!filePath) return sourceHanSerifPath

  if (filePath === DEFAULT_SOURCE_HAN_SERIF_PATH || filePath === sourceHanSerifPath) {
    return sourceHanSerifPath
  }

  if (filePath === DEFAULT_LXGW_WENKAI_PATH || filePath === lxgwWenKaiPath) {
    return lxgwWenKaiPath
  }

  return filePath
}

export async function checkAndDownloadFonts(ctx: Context, pluginName: string) {
  const fontDir = getFontDirByBaseDir(ctx.baseDir)
  const sourceHanSerifPath = getSourceHanSerifPathByBaseDir(ctx.baseDir)
  const lxgwWenKaiPath = getLxgwWenKaiPathByBaseDir(ctx.baseDir)
  const sourceHanSerifExists = existsSync(sourceHanSerifPath)
  const lxgwWenKaiExists = existsSync(lxgwWenKaiPath)

  if (sourceHanSerifExists && lxgwWenKaiExists) {
    ctx.logger.info(`[${pluginName}] 字体文件已存在，跳过下载`)
    return true
  }

  ctx.logger.info(`[${pluginName}] 开始下载字体文件...`)

  try {
    await mkdir(fontDir, { recursive: true })
  } catch (error) {
    ctx.logger.error(`[${pluginName}] 创建字体目录失败: ${error}`)
    return false
  }

  const downloadPromises: Promise<void>[] = []

  if (!sourceHanSerifExists) {
    ctx.logger.info(`[${pluginName}] 下载 SourceHanSerifSC-SemiBold.otf...`)
    downloadPromises.push(downloadFont(
      ctx,
      pluginName,
      SOURCE_HAN_SERIF_URL,
      sourceHanSerifPath,
    ))
  }

  if (!lxgwWenKaiExists) {
    ctx.logger.info(`[${pluginName}] 下载 LXGWWenKaiMono-Regular.ttf...`)
    downloadPromises.push(downloadFont(
      ctx,
      pluginName,
      LXGW_WENKAI_URL,
      lxgwWenKaiPath,
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
    const runtimePath = resolveRuntimeFontPath(ctx, filePath)
    const absolutePath = path.isAbsolute(runtimePath) ? runtimePath : path.resolve(__dirname, runtimePath)
    const buffer = await readFile(absolutePath)
    return buffer.toString('base64')
  } catch (error) {
    ctx.logger.error(`[${pluginName}]文件转换成base64失败: ${error.message}`)
    throw error
  }
}

export async function fileToBase64WithFallback(
  ctx: Context,
  pluginName: string,
  filePath: string,
): Promise<{ fontBase64: string; usedFontPath: string; fallbackUsed: boolean; error?: unknown }> {
  const runtimeFontPath = resolveRuntimeFontPath(ctx, filePath)
  const fallbackFontPath = getSourceHanSerifPathByBaseDir(ctx.baseDir)

  try {
    return {
      fontBase64: await fileToBase64(ctx, pluginName, runtimeFontPath),
      usedFontPath: runtimeFontPath,
      fallbackUsed: false,
    }
  } catch (error) {
    return {
      fontBase64: await fileToBase64(ctx, pluginName, fallbackFontPath),
      usedFontPath: fallbackFontPath,
      fallbackUsed: true,
      error,
    }
  }
}
