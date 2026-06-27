import path from 'path'

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

export const DEFAULT_SOURCE_HAN_SERIF_PATH = getSourceHanSerifPathByBaseDir(process.cwd())
export const DEFAULT_LXGW_WENKAI_PATH = getLxgwWenKaiPathByBaseDir(process.cwd())
