import type { TemplateOptions } from '../render';

const getFontSize = (sentenceLength: number, baseSize: number, decreaseRate: number, threshold: number) =>
    sentenceLength < threshold ? baseSize - decreaseRate * sentenceLength : baseSize - decreaseRate * threshold;

const getTimestamp = () => {
    return new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};

const escapeHtmlText = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getEscapedTemplateText = (options: Pick<TemplateOptions, 'sentence' | 'sentenceHtml' | 'username' | 'userId'>, timestamp: string) => ({
    sentence: options.sentenceHtml ?? escapeHtmlText(options.sentence),
    username: escapeHtmlText(options.username),
    userId: escapeHtmlText(options.userId),
    timestamp: escapeHtmlText(timestamp),
});

const getFontFaceCss = (options: TemplateOptions) => {
    const emojiFontFace = options.emojiFontBase64
        ? `
@font-face {
    font-family: 'TwemojiCOLR';
    src: url(data:font/truetype;charset=utf-8;base64,${options.emojiFontBase64}) format('truetype');
    font-display: block;
    unicode-range: U+1F000-1FAFF, U+2600-27BF, U+FE0F, U+200D;
}`
        : '';
    const customFontRange = options.fontUnicodeRange ? `unicode-range: ${options.fontUnicodeRange};` : '';
    return `
@font-face {
    font-family: 'CustomFont';
    src: url(data:font/truetype;charset=utf-8;base64,${options.fontBase64}) format('truetype');
    font-display: block;
    ${customFontRange}
}
${emojiFontFace}`;
};

const FONT_STACK = `'CustomFont', 'Microsoft YaHei', 'Segoe UI', Arial, sans-serif, 'TwemojiCOLR', 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji'`;

const getInlineResourceCss = (options: TemplateOptions) => `
.quote-inline-image {
    max-width: 100%;
    max-height: 8em;
    object-fit: contain;
    vertical-align: ${options.inlineMediaAlign};
    display: inline-block;
    border-radius: 6px;
}

.quote-inline-emoji {
    width: auto;
    height: 1.45em;
    max-height: 1.45em;
    border-radius: 0;
}

.quote-inline-mface {
    width: auto;
    height: 1.45em;
    max-height: 1.45em;
    border-radius: 0;
}
`;

const getGroupBadgeHtml = (options: TemplateOptions) => {
    if (!options.groupBadgeInfo) return '';

    const { levelText, titleText, color, bgColor } = options.groupBadgeInfo;
    const safeLevelText = escapeHtmlText(levelText);
    const safeTitleText = titleText ? escapeHtmlText(titleText) : '';

    if (titleText) {
        return `<div class="group-badge" style="color: ${color}; background-color: ${bgColor};"><span class="badge-level">${safeLevelText}</span><span class="badge-title">${safeTitleText}</span></div>`;
    }

    return `<div class="group-badge badge-level-only" style="color: ${color}; background-color: ${bgColor};"><span class="badge-level">${safeLevelText}</span></div>`;
};

export const getQqBubbleTemplateStr = async (options: TemplateOptions): Promise<string> => {
    const sentenceLength = options.sentence.length;
    const sentenceFontSize = Math.max(getFontSize(sentenceLength, 32, 0.15, 80), 24);
    const usernameFontSize = Math.max(getFontSize(sentenceLength, 26, 0.12, 80), 20);
    const userIdFontSize = Math.max(getFontSize(sentenceLength, 20, 0.10, 80), 16);
    const timestamp = getTimestamp();
    const preserveNewlinesCss = options.preserveNewlines ? 'white-space: pre-wrap;' : '';
    const htmlText = getEscapedTemplateText(options, timestamp);
    const groupBadgeHtml = getGroupBadgeHtml(options);

    const themeCss = options.enableDarkMode
        ? `
body {
    background-color: #1A1A1A;
    color: #CCCCCC;
}

.avatar {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.username {
    color: #E0E0E0;
}

.userid {
    color: #888;
}

.message-bubble {
    background-color: #2D2D2D;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.message-bubble::before {
    border-right: 8px solid #2D2D2D;
}

.sentence {
    color: #E0E0E0;
}

.metadata,
.timestamp {
    color: #888;
}
`
        : `
body {
    background-color: #F5F5F5;
    color: #333;
}

.avatar {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.username {
    color: #333;
}

.userid {
    color: #999;
}

.message-bubble {
    background-color: #FFFFFF;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.message-bubble::before {
    border-right: 8px solid #FFFFFF;
}

.sentence {
    color: #333;
}

.metadata,
.timestamp {
    color: #999;
}
`;

    const css = `
${getFontFaceCss(options)}
${getInlineResourceCss(options)}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    margin: 0;
    padding: 0;
    width: ${options.width}px;
    min-height: ${options.minHeight}px;
    font-family: ${FONT_STACK};
}

${themeCss}

#qq-bubble-container {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    width: 777px;
    max-width: 777px;
    margin: 0 auto;
    padding: 35px;
}

.avatar {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    flex-shrink: 0;
    background-image: url(data:image/png;base64,${options.avatarBase64});
    background-size: cover;
    background-position: center;
}

.content-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.header-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.group-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: bold;
    width: fit-content;
}

.badge-level-only {
    padding: 2px 6px;
}

.username-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.username {
    font-size: ${usernameFontSize}px;
    font-weight: bold;
    white-space: nowrap;
    max-width: 20ch;
    overflow: hidden;
    text-overflow: ellipsis;
}

.userid {
    font-size: ${userIdFontSize}px;
    line-height: 1.1;
}

.message-bubble {
    border-radius: 12px;
    padding: 13px 17px;
    position: relative;
    max-width: 100%;
    width: fit-content;
    word-break: break-word;
    line-height: 1.6;
}

.message-bubble::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 10px;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
}

.sentence {
    font-size: ${sentenceFontSize}px;
    ${preserveNewlinesCss}
}

.metadata {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 3px;
    font-size: 16px;
    line-height: 1.1;
}

.timestamp {
    font-size: 16px;
    line-height: 1.1;
}
`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>${css}</style>
</head>
<body>
    <div id="qq-bubble-container">
        <div class="avatar"></div>
        <div class="content-area">
            <div class="header-row">
                <div class="username">${htmlText.username}</div>
                ${groupBadgeHtml}
            </div>
            <div class="message-bubble">
                <div class="sentence">${htmlText.sentence}</div>
            </div>
            ${options.showUserId ? `<div class="userid">(UserId: ${htmlText.userId})</div>` : ''}
            ${options.showTimestamp ? `<div class="metadata"><div class="timestamp">${htmlText.timestamp}</div></div>` : ''}
        </div>
    </div>
</body>
</html>
`;
};
