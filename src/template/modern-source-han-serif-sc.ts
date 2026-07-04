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

const getCommonCss = (options: TemplateOptions) => `
* {
    box-sizing: border-box;
}

#content-wrapper {
    min-width: 0;
    max-width: calc(100% - 72px);
}

.quote {
    min-width: 0;
}

.sentence,
.userid,
.timestamp {
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
}

.username {
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: normal;
    word-break: normal;
}

.quote-inline-image {
    max-width: 100%;
    max-height: 8em;
    object-fit: contain;
    vertical-align: ${options.inlineMediaAlign};
    display: inline-block;
    border-radius: 6px;
}

.quote-inline-emoji {
    max-height: 1.6em;
    border-radius: 0;
}
`;

export const getModernSourceHanSerifSCTemplateStr = async (options: TemplateOptions): Promise<string> => {
    const sentenceLength = options.sentence.length;
    const sentenceFontSize = getFontSize(sentenceLength, 90, 0.35, 100);
    const usernameFontSize = getFontSize(sentenceLength, 80, 0.32, 100);
    const userIdFontSize = getFontSize(sentenceLength, 50, 0.25, 100);
    const timestamp = getTimestamp();
    const preserveNewlinesCss = options.preserveNewlines ? 'white-space: pre-wrap;' : '';
    const htmlText = getEscapedTemplateText(options, timestamp);

    const cardWidth = options.width * 0.9;
    const avatarSize = 200;

    const themeCss = options.enableDarkMode
        ? `
body {
    margin: 0;
    padding: 9px;
    width: ${options.width}px;
    min-height: ${options.minHeight}px;
    height: auto;
    background-image: url(data:image/png;base64,${options.avatarBase64});
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${FONT_STACK};
    color: #fff;
    position: relative;
}

#content-wrapper {
    background-color: rgba(0, 0, 0, 0.55);
}

.sentence {
    color: #fff;
    text-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
}

.username {
    color: #fff;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.userid {
    color: rgba(255, 255, 255, 0.7);
}

.timestamp {
    color: rgba(255, 255, 255, 0.6);
}
`
        : `
body {
    margin: 0;
    padding: 9px;
    width: ${options.width}px;
    min-height: ${options.minHeight}px;
    height: auto;
    background-image: url(data:image/png;base64,${options.avatarBase64});
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${FONT_STACK};
    color: #000;
    position: relative;
}

#content-wrapper {
    background-color: rgba(255, 255, 255, 0.55);
}

.sentence {
    color: #000;
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
}

.username {
    color: #000;
    text-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
}

.userid {
    color: rgba(0, 0, 0, 0.7);
}

.timestamp {
    color: rgba(0, 0, 0, 0.6);
}
`;

    const css = `
${getFontFaceCss(options)}
${getCommonCss(options)}
${themeCss}

#content-wrapper {
    margin: 36px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: ${cardWidth}px;
    backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    border-radius: 32px;
    padding: 40px 60px;
    gap: 40px;
    flex-direction: row;
}

.avatar {
    width: ${avatarSize}px;
    height: ${avatarSize}px;
    border-radius: 50%;
    background-image: url(data:image/png;base64,${options.avatarBase64});
    background-size: cover;
    background-position: center;
    flex-shrink: 0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.quote {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
}

.sentence {
    font-size: ${sentenceFontSize}px;
    margin-bottom: 16px;
    word-break: break-word;
    line-height: 1.3;
    ${preserveNewlinesCss}
}

.username {
    font-size: ${usernameFontSize}px;
    opacity: 0.75;
    text-align: right;
}

.userid {
    font-size: ${userIdFontSize}px;
    opacity: 0.6;
    text-align: right;
    margin-top: 2px;
}

.timestamp {
    font-size: 20px;
    text-align: right;
    margin-top: 8px;
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
    <div id="content-wrapper">
        <div class="avatar"></div>
        <div class="quote">
            <div class="sentence">"${htmlText.sentence}"</div>
            <div class="username">—— ${htmlText.username}</div>
            ${options.showUserId ? `<div class="userid">(userId:${htmlText.userId})</div>` : ''}
            ${options.showTimestamp ? `<div class="timestamp">${htmlText.timestamp}</div>` : ''}
        </div>
    </div>
</body>
</html>
`;
};
