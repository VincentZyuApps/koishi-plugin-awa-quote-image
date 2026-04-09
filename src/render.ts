import { Context } from 'koishi';
import { } from 'koishi-plugin-puppeteer';
import { IMAGE_TYPES, ImageStyleKey, ImageType } from './type';

interface TemplateOptions {
    sentence: string;
    username: string;
    userId: string;
    avatarBase64: string;
    width: number;
    minHeight: number;
    fontBase64: string;
    enableDarkMode: boolean;
    showUserId: boolean;
    showTimestamp: boolean;
    groupBadgeInfo?: {          // ✅ 新增可选字段：群徽章信息（群等级+群头衔）
        levelText: string;      // 群等级文本，如 "LV13"
        titleText?: string;     // 群头衔文本（可选），如 "群主"、"管理员"、自定义头衔
        color: string;          // 文字颜色
        bgColor: string;        // 背景颜色
    };
}

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
const getOriginBlackWhiteTemplateStr = async (options: TemplateOptions): Promise<string> => {
    const sentenceLength = options.sentence.length;
    const sentenceFontSize = getFontSize(sentenceLength, 100, 0.40, 100);
    const usernameFontSize = getFontSize(sentenceLength, 90, 0.36, 100);
    const userIdFontSize = getFontSize(sentenceLength, 60, 0.28, 100); // 新增
    const timestamp = getTimestamp();

    const css = options.enableDarkMode
        ? // 黑暗模式
        `@font-face{font-family:'CustomFont';src:url(data:font/truetype;charset=utf-8;base64,${options.fontBase64}) format('truetype');}body{margin:0;padding:0;width:${options.width}px;min-height:${options.minHeight}px;background:#000;display:flex;align-items:center;font-family:'CustomFont',sans-serif;color:#fff;position:relative;}#content-wrapper{display:flex;align-items:center;}.avatar{width:333px;height:333px;margin-left:40px;border-radius:100px;background-image:url(data:image/png;base64,${options.avatarBase64});background-size:cover;background-position:center;flex-shrink:0;}.quote{display:flex;flex-direction:column;justify-content:center;padding:20px 40px;flex:1;}.sentence{font-size:${sentenceFontSize}px;margin-bottom:16px;word-break:break-word;line-height:1.3;text-shadow:2px 2px 4px rgba(0,0,0,0.6);}.username{font-size:${usernameFontSize}px;opacity:0.8;text-align:right;text-shadow:1px 1px 2px rgba(0,0,0,0.5);}.userid{font-size:${userIdFontSize}px;opacity:0.7;text-align:right;color:rgba(255,255,255,0.7);margin-top:4px;}.timestamp{font-size:24px;color:rgba(255,255,255,0.6);text-align:right;margin-top:8px;}`
        : // 白天模式
        `@font-face{font-family:'CustomFont';src:url(data:font/truetype;charset=utf-8;base64,${options.fontBase64}) format('truetype');}body{margin:0;padding:0;width:${options.width}px;min-height:${options.minHeight}px;background:#fff;display:flex;align-items:center;font-family:'CustomFont',sans-serif;color:#000;position:relative;}#content-wrapper{display:flex;align-items:center;}.avatar{width:333px;height:333px;margin-left:40px;border-radius:100px;background-image:url(data:image/png;base64,${options.avatarBase64});background-size:cover;background-position:center;flex-shrink:0;}.quote{display:flex;flex-direction:column;justify-content:center;padding:20px 40px;flex:1;}.sentence{font-size:${sentenceFontSize}px;margin-bottom:16px;word-break:break-word;line-height:1.3;text-shadow:1px 1px 2px rgba(255,255,255,0.6);}.username{font-size:${usernameFontSize}px;opacity:0.8;text-align:right;text-shadow:0 0 1px rgba(255,255,255,0.5);}.userid{font-size:${userIdFontSize}px;opacity:0.7;text-align:right;color:rgba(0,0,0,0.7);margin-top:4px;}.timestamp{font-size:24px;color:rgba(0,0,0,0.6);text-align:right;margin-top:8px;}`;

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
            <div class="sentence">"${options.sentence}"</div>
            <div class="username">—— ${options.username}</div>
            ${options.showUserId ? `<div class="userid">(userId:${options.userId})</div>` : ''}
            ${options.showTimestamp ? `<div class="timestamp">${timestamp}</div>` : ''}
        </div>
    </div>
</body>
</html>
`;
};

const getModernSourceHanSerifSCTemplateStr = async (options: TemplateOptions): Promise<string> => {
    const sentenceLength = options.sentence.length;
    const sentenceFontSize = getFontSize(sentenceLength, 90, 0.35, 100);
    const usernameFontSize = getFontSize(sentenceLength, 80, 0.32, 100);
    const userIdFontSize = getFontSize(sentenceLength, 50, 0.25, 100); // 新增
    const timestamp = getTimestamp();

    const cardWidth = options.width * 0.9;
    const avatarSize = 200;

    const css = options.enableDarkMode
        ? // 黑暗模式
        `@font-face{font-family:'CustomFont';src:url(data:font/truetype;charset=utf-8;base64,${options.fontBase64}) format('truetype');}body{margin:0;padding:9px;width:${options.width}px;min-height:${options.minHeight}px;height:auto;background-image:url(data:image/png;base64,${options.avatarBase64});background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;font-family:'CustomFont',sans-serif;color:#fff;position:relative;}#content-wrapper{margin:36px;display:flex;align-items:center;justify-content:flex-start;width:${cardWidth}px;backdrop-filter:blur(20px) saturate(180%);background-color:rgba(0,0,0,0.55);box-shadow:0 8px 32px rgba(0,0,0,0.2);border-radius:32px;padding:40px 60px;gap:40px;flex-direction:row;} .avatar{width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;background-image:url(data:image/png;base64,${options.avatarBase64});background-size:cover;background-position:center;flex-shrink:0;box-shadow:0 4px 20px rgba(0,0,0,0.2);}.quote{display:flex;flex-direction:column;justify-content:center;flex:1;}.sentence{font-size:${sentenceFontSize}px;margin-bottom:16px;word-break:break-word;line-height:1.3;color:#fff;text-shadow:0 0 6px rgba(0,0,0,0.4);white-space:pre-wrap;}.username{font-size:${usernameFontSize}px;opacity:0.75;text-align:right;color:#fff;text-shadow:0 0 4px rgba(0,0,0,0.3);}.userid{font-size:${userIdFontSize}px;opacity:0.6;text-align:right;color:rgba(255,255,255,0.7);margin-top:2px;}.timestamp{font-size:20px;color:rgba(255,255,255,0.6);text-align:right;margin-top:8px;}`
        : // 白天模式
        `@font-face{font-family:'CustomFont';src:url(data:font/truetype;charset=utf-8;base64,${options.fontBase64}) format('truetype');}body{margin:0;padding:9px;width:${options.width}px;min-height:${options.minHeight}px;height:auto;background-image:url(data:image/png;base64,${options.avatarBase64});background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;font-family:'CustomFont',sans-serif;color:#000;position:relative;}#content-wrapper{margin:36px;display:flex;align-items:center;justify-content:flex-start;width:${cardWidth}px;backdrop-filter:blur(20px) saturate(180%);background-color:rgba(255,255,255,0.55);box-shadow:0 8px 32px rgba(0,0,0,0.2);border-radius:32px;padding:40px 60px;gap:40px;flex-direction:row;}.avatar{width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;background-image:url(data:image/png;base64,${options.avatarBase64});background-size:cover;background-position:center;flex-shrink:0;box-shadow:0 4px 20px rgba(0,0,0,0.2);}.quote{display:flex;flex-direction:column;justify-content:center;flex:1;}.sentence{font-size:${sentenceFontSize}px;margin-bottom:16px;word-break:break-word;line-height:1.3;color:#000;text-shadow:0 0 6px rgba(255,255,255,0.4);white-space:pre-wrap;}.username{font-size:${usernameFontSize}px;opacity:0.75;text-align:right;color:#000;text-shadow:0 0 4px rgba(255,255,255,0.3);}.userid{font-size:${userIdFontSize}px;opacity:0.6;text-align:right;color:rgba(0,0,0,0.7);margin-top:2px;}.timestamp{font-size:20px;color:rgba(0,0,0,0.6);text-align:right;margin-top:8px;}`;

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
            <div class="sentence">"${options.sentence}"</div>
            <div class="username">—— ${options.username}</div>
            ${options.showUserId ? `<div class="userid">(userId:${options.userId})</div>` : ''}
            ${options.showTimestamp ? `<div class="timestamp">${timestamp}</div>` : ''}
        </div>
    </div>
</body>
</html>
`;
};


const getCleanLXGWWenkaiTemplateStr = async (options: TemplateOptions): Promise<string> => {
    const sentenceLength = options.sentence.length;
    const sentenceFontSize = getFontSize(sentenceLength, 88, 0.34, 100);
    const usernameFontSize = getFontSize(sentenceLength, 76, 0.30, 100);
    const userIdFontSize = getFontSize(sentenceLength, 55, 0.26, 100); // 新增
    const timestamp = getTimestamp();

    const css = options.enableDarkMode
        ? // 黑暗模式
        `@font-face{font-family:'CustomFont';src:url(data:font/truetype;charset=utf-8;base64,${options.fontBase64}) format('truetype');}body{margin:0;padding:0;width:${options.width}px;min-height:${options.minHeight}px;display:flex;align-items:center;justify-content:center;font-family:'CustomFont',sans-serif;color:#eee;position:relative;background-color:#222;}#content-wrapper{display:flex;align-items:center;background-color:rgba(0,0,0,0.8);border-radius:24px;padding:32px 48px;gap:32px;box-shadow:0 2px 12px rgba(0,0,0,0.3);}.avatar{width:240px;height:240px;border-radius:32px;background-image:url(data:image/png;base64,${options.avatarBase64});background-size:cover;background-position:center;flex-shrink:0;}.quote{display:flex;flex-direction:column;justify-content:center;flex:1;}.sentence{font-size:${sentenceFontSize}px;margin-bottom:14px;word-break:break-word;line-height:1.4;color:#f0f0f0;}.username{font-size:${usernameFontSize}px;opacity:0.7;text-align:right;color:#aaa;}.userid{font-size:${userIdFontSize}px;opacity:0.6;text-align:right;color:rgba(255,255,255,0.7);margin-top:2px;}.timestamp{font-size:20px;color:rgba(255,255,255,0.6);text-align:right;margin-top:6px;}`
        : // 白天模式
        `@font-face{font-family:'CustomFont';src:url(data:font/truetype;charset=utf-8;base64,${options.fontBase64}) format('truetype');}body{margin:0;padding:0;width:${options.width}px;min-height:${options.minHeight}px;display:flex;align-items:center;justify-content:center;font-family:'CustomFont',sans-serif;color:#333;position:relative;background-color:#f0f0f0;}#content-wrapper{display:flex;align-items:center;background-color:rgba(255,255,255,0.92);border-radius:24px;padding:32px 48px;gap:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);}.avatar{width:240px;height:240px;border-radius:32px;background-image:url(data:image/png;base64,${options.avatarBase64});background-size:cover;background-position:center;flex-shrink:0;}.quote{display:flex;flex-direction:column;justify-content:center;flex:1;}.sentence{font-size:${sentenceFontSize}px;margin-bottom:14px;word-break:break-word;line-height:1.4;color:#222;}.username{font-size:${usernameFontSize}px;opacity:0.7;text-align:right;color:#4A90E2;}.userid{font-size:${userIdFontSize}px;opacity:0.6;text-align:right;color:rgba(0,0,0,0.7);margin-top:2px;}.timestamp{font-size:20px;color:rgba(0,0,0,0.6);text-align:right;margin-top:6px;}`;

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
            <div class="sentence">"${options.sentence}"</div>
            <div class="username">—— ${options.username}</div>
            ${options.showUserId ? `<div class="userid">(userId:${options.userId})</div>` : ''}
            ${options.showTimestamp ? `<div class="timestamp">${timestamp}</div>` : ''}
        </div>
    </div>
</body>
</html>
`;
};


// ========== 新增：QQ 气泡风格模板函数 ==========

/**
 * QQ 气泡模板（支持白天/黑夜模式）
 * 特点：模仿QQ默认消息气泡，支持群等级+群头衔徽章显示
 */
const getQqBubbleTemplateStr = async (options: TemplateOptions): Promise<string> => {
    const sentenceLength = options.sentence.length;
    const sentenceFontSize = Math.max(getFontSize(sentenceLength, 32, 0.15, 80), 24);
    const usernameFontSize = Math.max(getFontSize(sentenceLength, 26, 0.12, 80), 20);
    const userIdFontSize = Math.max(getFontSize(sentenceLength, 20, 0.10, 80), 16);
    const timestamp = getTimestamp();

    // 群徽章HTML（群等级 + 可选的群头衔）
    let groupBadgeHtml = '';
    if (options.groupBadgeInfo) {
        const { levelText, titleText, color, bgColor } = options.groupBadgeInfo;
        
        if (titleText) {
            // 有头衔：显示 "LVxx 头衔"
            groupBadgeHtml = `<div class="group-badge" style="color: ${color}; background-color: ${bgColor};"><span class="badge-level">${levelText}</span><span class="badge-title">${titleText}</span></div>`;
        } else {
            // 无头衔：只显示群等级
            groupBadgeHtml = `<div class="group-badge badge-level-only" style="color: ${color}; background-color: ${bgColor};"><span class="badge-level">${levelText}</span></div>`;
        }
    }

    // 根据 enableDarkMode 选择颜色方案
    const css = options.enableDarkMode
        ? // 黑夜模式
        `@font-face{font-family:'CustomFont';src:url(data:font/truetype;charset=utf-8;base64,${options.fontBase64}) format('truetype');}*{box-sizing:border-box;margin:0;padding:0;}body{margin:0;padding:0;width:${options.width}px;min-height:${options.minHeight}px;font-family:'CustomFont','Microsoft YaHei',sans-serif;background-color:#1A1A1A;color:#CCCCCC;}#qq-bubble-container{display:flex;align-items:flex-start;gap:20px;max-width:700px;margin:0 auto;padding:50px 60px;}.avatar{width:80px;height:80px;border-radius:50%;flex-shrink:0;background-image:url(data:image/png;base64,${options.avatarBase64});background-size:cover;background-position:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);}.content-area{flex:1;display:flex;flex-direction:column;gap:8px;}.header-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}.group-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:4px;font-size:14px;font-weight:bold;}.badge-level{}.badge-title{}.badge-level-only{padding:3px 10px;}.username-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}.username{font-size:${usernameFontSize}px;font-weight:bold;color:#E0E0E0;}.userid{font-size:${userIdFontSize}px;color:#888;}.message-bubble{background-color:#2D2D2D;border-radius:12px;padding:12px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.2);position:relative;max-width:480px;word-break:break-word;line-height:1.6;}.message-bubble::before{content:'';position:absolute;left:-8px;top:16px;width:0;height:0;border-top:8px solid transparent;border-bottom:8px solid transparent;border-right:8px solid #2D2D2D;}.sentence{font-size:${sentenceFontSize}px;color:#E0E0E0;}.metadata{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:16px;color:#888;}.timestamp{font-size:16px;color:#888;}`
        : // 白天模式
        `@font-face{font-family:'CustomFont';src:url(data:font/truetype;charset=utf-8;base64,${options.fontBase64}) format('truetype');}*{box-sizing:border-box;margin:0;padding:0;}body{margin:0;padding:0;width:${options.width}px;min-height:${options.minHeight}px;font-family:'CustomFont','Microsoft YaHei',sans-serif;background-color:#F5F5F5;color:#333;}#qq-bubble-container{display:flex;align-items:flex-start;gap:20px;max-width:700px;margin:0 auto;padding:50px 60px;}.avatar{width:80px;height:80px;border-radius:50%;flex-shrink:0;background-image:url(data:image/png;base64,${options.avatarBase64});background-size:cover;background-position:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);}.content-area{flex:1;display:flex;flex-direction:column;gap:8px;}.header-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}.group-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:4px;font-size:14px;font-weight:bold;}.badge-level{}.badge-title{}.badge-level-only{padding:3px 10px;}.username-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}.username{font-size:${usernameFontSize}px;font-weight:bold;color:#333;}.userid{font-size:${userIdFontSize}px;color:#999;}.message-bubble{background-color:#FFFFFF;border-radius:12px;padding:12px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);position:relative;max-width:480px;word-break:break-word;line-height:1.6;}.message-bubble::before{content:'';position:absolute;left:-8px;top:16px;width:0;height:0;border-top:8px solid transparent;border-bottom:8px solid transparent;border-right:8px solid #FFFFFF;}.sentence{font-size:${sentenceFontSize}px;color:#333;}.metadata{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:16px;color:#999;}.timestamp{font-size:16px;color:#999;}`;

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
                <div class="username">${options.username}</div>
                ${groupBadgeHtml}
            </div>
            ${options.showUserId ? `<div class="userid">(ID: ${options.userId})</div>` : ''}
            <div class="message-bubble">
                <div class="sentence">${options.sentence}</div>
            </div>
            ${options.showTimestamp ? `<div class="metadata"><div class="timestamp">${timestamp}</div></div>` : ''}
        </div>
    </div>
</body>
</html>
`;
};

// ================================================

export async function renderQuoteImage(
    ctx: Context,
    args: {
        sentence: string,               username: string,               userId:string,  avatarBase64: string,
        width: number,                  minHeight: number,
        selectedStyle: ImageStyleKey,   fontBase64: string,             enableDarkMode: boolean,
        imageType: ImageType,           pageScreenshotquality: number,
        showUserId: boolean,            showTimestamp: boolean,
        groupBadgeInfo?: {              // ✅ 新增可选字段：群徽章信息（群等级+群头衔）
            levelText: string;          // 群等级文本，如 "LV13"
            titleText?: string;         // 群头衔文本（可选），如 "群主"、"管理员"、自定义头衔
            color: string;              // 文字颜色
            bgColor: string;            // 背景颜色
        };
    }
) {
    const browserPage = await ctx.puppeteer.page();
    let html: string;

    try {
        const templateOptions: TemplateOptions = {
            sentence: args.sentence,
            username: args.username,
            userId: args.userId,
            avatarBase64: args.avatarBase64,
            width: args.width,
            minHeight: args.minHeight,
            fontBase64: args.fontBase64,
            enableDarkMode: args.enableDarkMode,
            showUserId: args.showUserId,
            showTimestamp: args.showTimestamp,
            groupBadgeInfo: args.groupBadgeInfo,  // ✅ 新增：群徽章信息（群等级+群头衔）
        };

        switch (args.selectedStyle) {
            case 'ORIGIN_BLACK_WHITE':
                html = await getOriginBlackWhiteTemplateStr(templateOptions);
                break;
            case 'MODERN_SOURCE_HAN_SERIF_SC':
                html = await getModernSourceHanSerifSCTemplateStr(templateOptions);
                break;
            case 'CLEAN_LXGW_WENKAI':
                html = await getCleanLXGWWenkaiTemplateStr(templateOptions);
                break;
            case 'QQ_BUBBLE':
                html = await getQqBubbleTemplateStr(templateOptions);
                break;
            default:
                html = await getOriginBlackWhiteTemplateStr(templateOptions);
        }

        // writeFileSync(path.join(__dirname, 'tmp.html'), html);

        browserPage.on('console', msg => {
            ctx.logger.debug(`Puppeteer console: ${msg.text()}`);
        });
        browserPage.on('pageerror', error => {
            ctx.logger.error(`Puppeteer page error: ${error.message}`);
        });

        await browserPage.setContent(html);
        await browserPage.setViewport({ width: args.width, height: 9999 });

        await browserPage.waitForSelector('body', { timeout: 5000 });

        // 根据不同的样式选择不同的容器选择器
        let wrapperId: string;
        if (args.selectedStyle === 'MODERN_SOURCE_HAN_SERIF_SC') {
            wrapperId = 'body';
        } else if (args.selectedStyle === 'QQ_BUBBLE') {
            wrapperId = '#qq-bubble-container';  // QQ气泡样式使用不同的容器ID
        } else {
            wrapperId = '#content-wrapper';  // 其他样式使用默认容器
        }
        
        const element = await browserPage.$(wrapperId);

        if (!element) {
            throw new Error(`无法找到渲染容器元素: ${wrapperId}。可能是HTML模板结构有误或CSS加载失败。`);
        }

        const res = await element.screenshot({
            encoding: 'base64',
            type: args.imageType,
            ...(args.imageType !== IMAGE_TYPES.PNG && { quality: args.pageScreenshotquality })
        });

        return res;

    } catch (err) {

        ctx.logger.error(`error: ${err}`);

    } finally {

        await browserPage.close();

    }
}