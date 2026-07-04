export const IMAGE_STYLES = {
    ORIGIN_BLACK_WHITE: '原始_黑底白字',
    MODERN_SOURCE_HAN_SERIF_SC: '现代_思源宋体',
    CLEAN_LXGW_WENKAI: '简洁_落霞孤鹜文楷',
    QQ_BUBBLE: 'QQ气泡',
} as const;

export type ImageStyleKey = keyof typeof IMAGE_STYLES;
export type ImageStyleValue = typeof IMAGE_STYLES[ImageStyleKey];

export const IMAGE_STYLE_KEY_ARR = Object.keys(IMAGE_STYLES) as ImageStyleKey[];


export const IMAGE_TYPES = {
    PNG: 'png',
    JPEG: 'jpeg',
    WEBP: 'webp',
} as const;

export type ImageType = typeof IMAGE_TYPES[keyof typeof IMAGE_TYPES];

export const INLINE_MEDIA_ALIGNS = {
    TOP: 'top',
    MIDDLE: 'middle',
    BOTTOM: 'bottom',
} as const;

export type InlineMediaAlign = typeof INLINE_MEDIA_ALIGNS[keyof typeof INLINE_MEDIA_ALIGNS];
