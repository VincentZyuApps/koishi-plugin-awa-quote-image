import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { createHash } from 'crypto'
import type { Context } from 'koishi'

export const SOURCE_HAN_SERIF_FILE_NAME = 'SourceHanSerifSC-SemiBold.otf'
export const LXGW_WENKAI_FILE_NAME = 'LXGWWenKaiMono-Regular.ttf'
export const TWEMOJI_COLR_FILE_NAME = 'TwemojiCOLRv0.ttf'

const GITEE_RELEASE_BASE = 'https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts'
const GITHUB_RELEASE_BASE = 'https://github.com/VincentZyuApps/koishi-plugin-awa-quote-image/releases/download/fonts'

export const SOURCE_HAN_SERIF_URL = `${GITEE_RELEASE_BASE}/${SOURCE_HAN_SERIF_FILE_NAME}`
export const LXGW_WENKAI_URL = `${GITEE_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}`
export const TWEMOJI_COLR_URL = `${GITEE_RELEASE_BASE}/${TWEMOJI_COLR_FILE_NAME}`

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
  [TWEMOJI_COLR_FILE_NAME]: {
    size: 1454532,
    md5: '586ab9cc40bf148778810a85312a5488',
    sha1: 'f85f8dd7af424214e1a2f480837c8e1ce152d44c',
    sha256: '61db6397b8b32b72c585d538ef698a84cf78cf2558a14046b3fa0ec4cc362540',
    sha512: 'bcc08459e94b8d0d07cafeb75f4c6439b965fdc37ee18ef8fb5ba2cb7d9ae1230da192307187840789bcc645c1291b6a9d100e989b7e67ef973e5eb80ce8080c',
  },
}

const FONT_DOWNLOAD_URLS: Record<string, { source: string; url: string }[]> = {
  [SOURCE_HAN_SERIF_FILE_NAME]: [
    { source: 'Gitee', url: `${GITEE_RELEASE_BASE}/${SOURCE_HAN_SERIF_FILE_NAME}` },
    { source: 'GitHub', url: `${GITHUB_RELEASE_BASE}/${SOURCE_HAN_SERIF_FILE_NAME}` },
  ],
  [LXGW_WENKAI_FILE_NAME]: [
    { source: 'Gitee', url: `${GITEE_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}` },
    { source: 'GitHub', url: `${GITHUB_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}` },
  ],
  [TWEMOJI_COLR_FILE_NAME]: [
    { source: 'Gitee', url: `${GITEE_RELEASE_BASE}/${TWEMOJI_COLR_FILE_NAME}` },
    { source: 'GitHub', url: `${GITHUB_RELEASE_BASE}/${TWEMOJI_COLR_FILE_NAME}` },
  ],
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

export function getTwemojiColrPathByBaseDir(baseDir: string) {
  return path.join(getFontDirByBaseDir(baseDir), TWEMOJI_COLR_FILE_NAME)
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

function verifyFontBuffer(buffer: Buffer, expected: FontIntegrity): boolean {
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
export const DEFAULT_TWEMOJI_COLR_PATH = getTwemojiColrPathByBaseDir(process.cwd())

export function resolveRuntimeFontPath(ctx: Context, filePath: string): string {
  const sourceHanSerifPath = getSourceHanSerifPathByBaseDir(ctx.baseDir)
  const lxgwWenKaiPath = getLxgwWenKaiPathByBaseDir(ctx.baseDir)
  const twemojiColrPath = getTwemojiColrPathByBaseDir(ctx.baseDir)

  if (!filePath) return sourceHanSerifPath

  if (filePath === DEFAULT_SOURCE_HAN_SERIF_PATH || filePath === sourceHanSerifPath) {
    return sourceHanSerifPath
  }

  if (filePath === DEFAULT_LXGW_WENKAI_PATH || filePath === lxgwWenKaiPath) {
    return lxgwWenKaiPath
  }

  if (filePath === DEFAULT_TWEMOJI_COLR_PATH || filePath === twemojiColrPath) {
    return twemojiColrPath
  }

  return filePath
}

export async function checkAndDownloadFonts(ctx: Context, pluginName: string, includeEmojiFont = true) {
  const fontDir = getFontDirByBaseDir(ctx.baseDir)
  const sourceHanSerifPath = getSourceHanSerifPathByBaseDir(ctx.baseDir)
  const lxgwWenKaiPath = getLxgwWenKaiPathByBaseDir(ctx.baseDir)
  const twemojiColrPath = getTwemojiColrPathByBaseDir(ctx.baseDir)
  const sourceHanSerifReady = await verifyFontIntegrity(sourceHanSerifPath, FONT_INTEGRITY[SOURCE_HAN_SERIF_FILE_NAME])
  const lxgwWenKaiReady = await verifyFontIntegrity(lxgwWenKaiPath, FONT_INTEGRITY[LXGW_WENKAI_FILE_NAME])
  const twemojiColrReady = !includeEmojiFont || await verifyFontIntegrity(twemojiColrPath, FONT_INTEGRITY[TWEMOJI_COLR_FILE_NAME])

  if (sourceHanSerifReady && lxgwWenKaiReady && twemojiColrReady) {
    ctx.logger.info(`✅ 字体文件已存在且 hash 校验通过，跳过下载`)
    return true
  }

  ctx.logger.info(`📥 开始下载字体文件...`)

  try {
    await mkdir(fontDir, { recursive: true })
  } catch (error) {
    ctx.logger.error(`❌ 创建字体目录失败: ${error}`)
    return false
  }

  if (!sourceHanSerifReady) {
    if (existsSync(sourceHanSerifPath)) ctx.logger.warn(`⚠️ SourceHanSerifSC-SemiBold.otf hash 校验失败，将重新下载`)
    ctx.logger.info(`📥 下载 SourceHanSerifSC-SemiBold.otf...`)
    const ok = await downloadFont(
      ctx,
      pluginName,
      SOURCE_HAN_SERIF_URL,
      sourceHanSerifPath,
    ).then(() => true).catch((error) => {
      ctx.logger.error(`❌ SourceHanSerifSC-SemiBold.otf 下载失败: ${error?.message || error}`)
      return false
    })
    if (!ok) return false
  }

  if (!lxgwWenKaiReady) {
    if (existsSync(lxgwWenKaiPath)) ctx.logger.warn(`⚠️ LXGWWenKaiMono-Regular.ttf hash 校验失败，将重新下载`)
    ctx.logger.info(`📥 下载 LXGWWenKaiMono-Regular.ttf...`)
    const ok = await downloadFont(
      ctx,
      pluginName,
      LXGW_WENKAI_URL,
      lxgwWenKaiPath,
    ).then(() => true).catch((error) => {
      ctx.logger.error(`❌ LXGWWenKaiMono-Regular.ttf 下载失败: ${error?.message || error}`)
      return false
    })
    if (!ok) return false
  }

  if (!twemojiColrReady) {
    if (existsSync(twemojiColrPath)) ctx.logger.warn(`⚠️ TwemojiCOLRv0.ttf hash 校验失败，将重新下载`)
    ctx.logger.info(`📥 下载 TwemojiCOLRv0.ttf...`)
    const ok = await downloadFont(
      ctx,
      pluginName,
      TWEMOJI_COLR_URL,
      twemojiColrPath,
    ).then(() => true).catch((error) => {
      ctx.logger.error(`❌ TwemojiCOLRv0.ttf 下载失败: ${error?.message || error}`)
      return false
    })
    if (!ok) return false
  }

  ctx.logger.info(`✅ 字体文件下载完成，hash 校验通过`)
  return true
}

export async function downloadFont(ctx: Context, pluginName: string, url: string, filePath: string): Promise<void> {
  const fileName = path.basename(filePath)
  const expected = FONT_INTEGRITY[fileName]
  const candidates = FONT_DOWNLOAD_URLS[fileName] || [{ source: 'configured', url }]
  let lastError: unknown = null

  for (const candidate of candidates) {
    try {
      ctx.logger.info(`📥 开始下载字体文件: ${fileName} (${candidate.source})`)
      const response = await ctx.http.get(candidate.url, {
        responseType: 'arraybuffer',
        timeout: 60000,
      })
      const buffer = Buffer.from(response)
      if (expected && !verifyFontBuffer(buffer, expected)) {
        throw new Error(`字体 hash 校验失败: ${fileName}`)
      }
      await writeFile(filePath, buffer)
      if (expected && !(await verifyFontIntegrity(filePath, expected))) {
        throw new Error(`字体写入后 hash 校验失败: ${fileName}`)
      }
      ctx.logger.info(`✅ 字体文件下载成功且 hash 校验通过: ${fileName} (${candidate.source})`)
      return
    } catch (error) {
      lastError = error
      ctx.logger.warn(`⚠️ ${candidate.source} 下载字体失败 ${fileName}: ${error?.message || error}`)
    }
  }

  throw new Error(`字体文件下载失败 ${fileName}，Gitee / GitHub 均不可用或校验失败: ${lastError instanceof Error ? lastError.message : lastError}`)
}

export async function fileToBase64(ctx: Context, pluginName: string, filePath: string): Promise<string> {
  try {
    const runtimePath = resolveRuntimeFontPath(ctx, filePath)
    const absolutePath = path.isAbsolute(runtimePath) ? runtimePath : path.resolve(__dirname, runtimePath)
    const buffer = await readFile(absolutePath)
    return buffer.toString('base64')
  } catch (error) {
    ctx.logger.error(`❌ 文件转换成 base64 失败: ${error.message}`)
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
    const fallbackReady = await verifyFontIntegrity(fallbackFontPath, FONT_INTEGRITY[SOURCE_HAN_SERIF_FILE_NAME])
    if (!fallbackReady) {
      throw new Error(`默认字体不可用，无法 fallback: source=${runtimeFontPath}, fallback=${fallbackFontPath}, error=${error instanceof Error ? error.message : error}`)
    }
    return {
      fontBase64: await fileToBase64(ctx, pluginName, fallbackFontPath),
      usedFontPath: fallbackFontPath,
      fallbackUsed: true,
      error,
    }
  }
}
