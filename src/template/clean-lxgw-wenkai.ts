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

.quote-message-image {
    display: inline-block;
    max-width: 100%;
    max-height: 720px;
    width: min(100%, 520px);
    height: auto;
    object-fit: contain;
    vertical-align: ${options.inlineMediaAlign};
    border-radius: 6px;
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

export const getCleanLXGWWenkaiTemplateStr = async (options: TemplateOptions): Promise<string> => {
    const sentenceLength = options.sentence.length;
    const sentenceFontSize = getFontSize(sentenceLength, 88, 0.34, 100);
    const usernameFontSize = getFontSize(sentenceLength, 76, 0.30, 100);
    const userIdFontSize = getFontSize(sentenceLength, 55, 0.26, 100);
    const timestamp = getTimestamp();
    const preserveNewlinesCss = options.preserveNewlines ? 'white-space: pre-wrap;' : '';
    const htmlText = getEscapedTemplateText(options, timestamp);

    const themeCss = options.enableDarkMode
        ? `
body {
    margin: 0;
    padding: 0;
    width: ${options.width}px;
    min-height: ${options.minHeight}px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${FONT_STACK};
    color: #eee;
    position: relative;
    background-color: #222;
}

#content-wrapper {
    background-color: rgba(0, 0, 0, 0.8);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.sentence {
    color: #f0f0f0;
}

.username {
    color: #aaa;
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
    padding: 0;
    width: ${options.width}px;
    min-height: ${options.minHeight}px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${FONT_STACK};
    color: #333;
    position: relative;
    background-color: #f0f0f0;
}

#content-wrapper {
    background-color: rgba(255, 255, 255, 0.92);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.sentence {
    color: #222;
}

.username {
    color: #4A90E2;
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
    display: flex;
    align-items: center;
    border-radius: 24px;
    padding: 32px 48px;
    gap: 32px;
}

.avatar {
    width: 240px;
    height: 240px;
    border-radius: 32px;
    background-image: url(data:image/png;base64,${options.avatarBase64});
    background-size: cover;
    background-position: center;
    flex-shrink: 0;
}

.quote {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
}

.sentence {
    font-size: ${sentenceFontSize}px;
    margin-bottom: 14px;
    word-break: break-word;
    line-height: 1.4;
    ${preserveNewlinesCss}
}

.username {
    font-size: ${usernameFontSize}px;
    opacity: 0.7;
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
    margin-top: 6px;
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
