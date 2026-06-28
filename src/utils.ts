import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { createHash } from 'crypto'
import type { Context } from 'koishi'

export const SOURCE_HAN_SERIF_FILE_NAME = 'SourceHanSerifSC-SemiBold.otf'
export const LXGW_WENKAI_FILE_NAME = 'LXGWWenKaiMono-Regular.ttf'

export const SOURCE_HAN_SERIF_URL = 'http://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/SourceHanSerifSC-SemiBold.otf'
export const LXGW_WENKAI_URL = 'http://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/LXGWWenKaiMono-Regular.ttf'

interface FontIntegrity {
  size: number
  md5: string
  sha1: string
  sha256: string
  sha512: string
}

const FONT_INTEGRITY: Record<string, FontIntegrity> = {
  [SOURCE_HAN_SERIF_FILE_NAME]: {
    size: 24698348,
    md5: 'ce6fb6b5cd472dc04e5873a70db89f57',
    sha1: 'd16e231972b1e410797432dc9be80d9db12ce387',
    sha256: 'd3f1607fbc5c838c0b892c3fe5f2251d5ac16cdf6e2d49bf899fb96abca10c5f',
    sha512: 'a7412b69a919a860ec982b0a16d800647f1ab7112e6d73e511eeae67882f928ad396aed5b4e1528510dfdcb4b08c9d8b77fa4cd0189efc6924622a581b9f9083',
  },
  [LXGW_WENKAI_FILE_NAME]: {
    size: 24755236,
    md5: '90e75a25cca0e8868977b880352c6a53',
    sha1: '7f018ad4a181e4d2df4f972f357e612885d6c24a',
    sha256: 'ee9faa6479c5b2434f9bceca8e2e7b643f699f4f3d067aac9609261e07c6be61',
    sha512: '793dc4357d311dba539c50b0ae38ff247af066f141ffea54ff0cc51e274453671e736989cee4998fd89211035ecfe52ad38aa828ba7f1739bcf107b94a023be5',
  },
}

export function getFontDirByBaseDir(baseDir: string) {
  return path.join(baseDir, 'data', 'fonts')
}

export function getSourceHanSerifPathByBaseDir(baseDir: string) {
  return path.join(getFontDirByBaseDir(baseDir), SOURCE_HAN_SERIF_FILE_NAME)
}

export function getLxgwWenKaiPathByBaseDir(baseDir: string) {
  return path.join(getFontDirByBaseDir(baseDir), LXGW_WENKAI_FILE_NAME)
}

function calculateFontHashes(buffer: Buffer) {
  return {
    md5: createHash('md5').update(buffer).digest('hex'),
    sha1: createHash('sha1').update(buffer).digest('hex'),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    sha512: createHash('sha512').update(buffer).digest('hex'),
  }
}

async function verifyFontIntegrity(filePath: string, expected: FontIntegrity): Promise<boolean> {
  if (!existsSync(filePath)) return false
  const buffer = await readFile(filePath)
  if (buffer.length !== expected.size) return false
  const hashes = calculateFontHashes(buffer)
  return hashes.md5 === expected.md5
    && hashes.sha1 === expected.sha1
    && hashes.sha256 === expected.sha256
    && hashes.sha512 === expected.sha512
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
  const sourceHanSerifReady = await verifyFontIntegrity(sourceHanSerifPath, FONT_INTEGRITY[SOURCE_HAN_SERIF_FILE_NAME])
  const lxgwWenKaiReady = await verifyFontIntegrity(lxgwWenKaiPath, FONT_INTEGRITY[LXGW_WENKAI_FILE_NAME])

  if (sourceHanSerifReady && lxgwWenKaiReady) {
    ctx.logger.info(`[${pluginName}] ✅ 字体文件已存在且 hash 校验通过，跳过下载`)
    return true
  }

  ctx.logger.info(`[${pluginName}] 📥 开始下载字体文件...`)

  try {
    await mkdir(fontDir, { recursive: true })
  } catch (error) {
    ctx.logger.error(`[${pluginName}] ❌ 创建字体目录失败: ${error}`)
    return false
  }

  const downloadPromises: Promise<void>[] = []

  if (!sourceHanSerifReady) {
    if (existsSync(sourceHanSerifPath)) ctx.logger.warn(`[${pluginName}] ⚠️ SourceHanSerifSC-SemiBold.otf hash 校验失败，将重新下载`)
    ctx.logger.info(`[${pluginName}] 📥 下载 SourceHanSerifSC-SemiBold.otf...`)
    downloadPromises.push(downloadFont(
      ctx,
      pluginName,
      SOURCE_HAN_SERIF_URL,
      sourceHanSerifPath,
    ))
  }

  if (!lxgwWenKaiReady) {
    if (existsSync(lxgwWenKaiPath)) ctx.logger.warn(`[${pluginName}] ⚠️ LXGWWenKaiMono-Regular.ttf hash 校验失败，将重新下载`)
    ctx.logger.info(`[${pluginName}] 📥 下载 LXGWWenKaiMono-Regular.ttf...`)
    downloadPromises.push(downloadFont(
      ctx,
      pluginName,
      LXGW_WENKAI_URL,
      lxgwWenKaiPath,
    ))
  }

  try {
    await Promise.all(downloadPromises)
    ctx.logger.info(`[${pluginName}] ✅ 字体文件下载完成，hash 校验通过`)
    return true
  } catch (error) {
    ctx.logger.error(`[${pluginName}] ❌ 字体文件下载失败: ${error}`)
    return false
  }
}

export async function downloadFont(ctx: Context, pluginName: string, url: string, filePath: string): Promise<void> {
  const fileName = path.basename(filePath)
  const expected = FONT_INTEGRITY[fileName]

  try {
    ctx.logger.info(`[${pluginName}] 📥 开始下载字体文件: ${fileName}`)
    const response = await ctx.http.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
    })
    await writeFile(filePath, Buffer.from(response))
    if (expected && !(await verifyFontIntegrity(filePath, expected))) {
      throw new Error(`❌ 字体 hash 校验失败: ${fileName}`)
    }
    ctx.logger.info(`[${pluginName}] ✅ 字体文件下载成功且 hash 校验通过: ${fileName}`)
  } catch (error) {
    ctx.logger.error(`[${pluginName}] ❌ 字体文件下载失败 ${fileName}: ${error}`)
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
