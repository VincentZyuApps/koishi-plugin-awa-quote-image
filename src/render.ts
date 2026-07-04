import { Context } from 'koishi';
import { } from 'koishi-plugin-puppeteer';
import { IMAGE_TYPES, ImageStyleKey, ImageType, InlineMediaAlign } from './types';
import { getOriginBlackWhiteTemplateStr } from './template/origin-black-white';
import { getModernSourceHanSerifSCTemplateStr } from './template/modern-source-han-serif-sc';
import { getCleanLXGWWenkaiTemplateStr } from './template/clean-lxgw-wenkai';
import { getQqBubbleTemplateStr } from './template/qq-bubble';

export interface TemplateOptions {
    sentence: string;
    sentenceHtml?: string;
    username: string;
    userId: string;
    avatarBase64: string;
    width: number;
    minHeight: number;
    fontBase64: string;
    fontUnicodeRange?: string;
    emojiFontBase64?: string;
    inlineMediaAlign: InlineMediaAlign;
    enableDarkMode: boolean;
    showUserId: boolean;
    showTimestamp: boolean;
    preserveNewlines: boolean;
    groupBadgeInfo?: {
        levelText: string;
        titleText?: string;
        color: string;
        bgColor: string;
    };
}

async function waitForFontsAndStableLayout(browserPage, selector: string) {
    await browserPage.evaluate(async (targetSelector: string) => {
        const fonts = (document as any).fonts;
        if (fonts?.ready) await fonts.ready;

        const element = document.querySelector(targetSelector);
        if (!element) return;

        let previous = '';
        let stableFrames = 0;
        for (let i = 0; i < 10 && stableFrames < 2; i++) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            const rect = element.getBoundingClientRect();
            const current = [rect.x, rect.y, rect.width, rect.height, document.body.scrollWidth, document.body.scrollHeight].join(',');
            if (current === previous) {
                stableFrames++;
            } else {
                stableFrames = 0;
                previous = current;
            }
        }
    }, selector);
}

async function getScreenshotClip(
    browserPage,
    selector: string,
    fixedCanvas?: { width: number; minHeight: number },
) {
    const metrics = await browserPage.evaluate((targetSelector: string) => {
        const element = document.querySelector(targetSelector);
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        return {
            devicePixelRatio: window.devicePixelRatio,
            target: {
                x: rect.left + window.scrollX,
                y: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height,
                scrollWidth: element.scrollWidth,
                scrollHeight: element.scrollHeight,
            },
            body: {
                width: document.body.getBoundingClientRect().width,
                height: document.body.getBoundingClientRect().height,
                scrollWidth: document.body.scrollWidth,
                scrollHeight: document.body.scrollHeight,
            },
        };
    }, selector);

    if (!metrics) {
        throw new Error(`无法找到渲染容器元素: ${selector}。可能是HTML模板结构有误或CSS加载失败。`);
    }

    const clip = fixedCanvas
        ? {
            x: 0,
            y: 0,
            width: Math.max(
                fixedCanvas.width,
                Math.ceil(metrics.target.width),
                Math.ceil(metrics.target.scrollWidth),
                Math.ceil(metrics.body.width),
                Math.ceil(metrics.body.scrollWidth),
            ),
            height: Math.max(
                fixedCanvas.minHeight,
                Math.ceil(metrics.target.height),
                Math.ceil(metrics.target.scrollHeight),
                Math.ceil(metrics.body.height),
                Math.ceil(metrics.body.scrollHeight),
            ),
        }
        : {
            x: Math.max(0, Math.floor(metrics.target.x)),
            y: Math.max(0, Math.floor(metrics.target.y)),
            width: Math.max(1, Math.ceil(metrics.target.width)),
            height: Math.max(1, Math.ceil(metrics.target.height)),
        };

    return { ...metrics, clip };
}

function getTemplateForStyle(selectedStyle: ImageStyleKey) {
    switch (selectedStyle) {
        case 'ORIGIN_BLACK_WHITE':
            return getOriginBlackWhiteTemplateStr;
        case 'MODERN_SOURCE_HAN_SERIF_SC':
            return getModernSourceHanSerifSCTemplateStr;
        case 'CLEAN_LXGW_WENKAI':
            return getCleanLXGWWenkaiTemplateStr;
        case 'QQ_BUBBLE':
            return getQqBubbleTemplateStr;
        default:
            return getOriginBlackWhiteTemplateStr;
    }
}

export async function renderQuoteImage(
    ctx: Context,
    args: {
        sentence: string,               username: string,               userId:string,  avatarBase64: string,
        sentenceHtml?: string,
        width: number,                  minHeight: number,
        selectedStyle: ImageStyleKey,   fontBase64: string,             enableDarkMode: boolean,
        fontUnicodeRange?: string,
        emojiFontBase64?: string,
        inlineMediaAlign: InlineMediaAlign,
        imageType: ImageType,           enablePageScreenshotQuality: number,
        verboseConsoleLog?: boolean,
        showUserId: boolean,            showTimestamp: boolean,
        preserveNewlines: boolean,
        groupBadgeInfo?: {
            levelText: string;
            titleText?: string;
            color: string;
            bgColor: string;
        };
    }
) {
    const browserPage = await ctx.puppeteer.page();

    try {
        const templateOptions: TemplateOptions = {
            sentence: args.sentence,
            sentenceHtml: args.sentenceHtml,
            username: args.username,
            userId: args.userId,
            avatarBase64: args.avatarBase64,
            width: args.width,
            minHeight: args.minHeight,
            fontBase64: args.fontBase64,
            fontUnicodeRange: args.fontUnicodeRange,
            emojiFontBase64: args.emojiFontBase64,
            inlineMediaAlign: args.inlineMediaAlign,
            enableDarkMode: args.enableDarkMode,
            showUserId: args.showUserId,
            showTimestamp: args.showTimestamp,
            preserveNewlines: args.preserveNewlines,
            groupBadgeInfo: args.groupBadgeInfo,
        };

        const html = await getTemplateForStyle(args.selectedStyle)(templateOptions);

        browserPage.on('console', msg => {
            ctx.logger.debug(`🔍 Puppeteer console: ${msg.text()}`);
        });
        browserPage.on('pageerror', error => {
            ctx.logger.error(`❌ Puppeteer page error: ${error.message}`);
        });

        await browserPage.setViewport({ width: args.width, height: 9999, deviceScaleFactor: 1 });
        await browserPage.setContent(html, { waitUntil: 'load' });

        await browserPage.waitForSelector('body', { timeout: 5000 });

        let wrapperId: string;
        if (args.selectedStyle === 'MODERN_SOURCE_HAN_SERIF_SC') {
            wrapperId = 'body';
        } else if (args.selectedStyle === 'QQ_BUBBLE') {
            wrapperId = '#qq-bubble-container';
        } else {
            wrapperId = '#content-wrapper';
        }

        await browserPage.waitForSelector(wrapperId, { timeout: 5000 });
        await waitForFontsAndStableLayout(browserPage, wrapperId);

        if (args.selectedStyle !== 'MODERN_SOURCE_HAN_SERIF_SC') {
            const element = await browserPage.$(wrapperId);

            if (!element) {
                throw new Error(`无法找到渲染容器元素: ${wrapperId}。可能是HTML模板结构有误或CSS加载失败。`);
            }

            const res = await element.screenshot({
                encoding: 'base64',
                type: args.imageType,
                ...(args.imageType !== IMAGE_TYPES.PNG && { quality: args.enablePageScreenshotQuality })
            });
            return res;
        }

        const screenshotClip = await getScreenshotClip(
            browserPage,
            wrapperId,
            { width: args.width, minHeight: args.minHeight },
        );
        if (args.verboseConsoleLog) {
            ctx.logger.info(`📐 Puppeteer screenshot clip: style=${args.selectedStyle}, selector=${wrapperId}, metrics=${JSON.stringify(screenshotClip)}`);
        } else {
            ctx.logger.debug(`🔍 Puppeteer screenshot clip: style=${args.selectedStyle}, selector=${wrapperId}, metrics=${JSON.stringify(screenshotClip)}`);
        }

        const res = await browserPage.screenshot({
            encoding: 'base64',
            type: args.imageType,
            clip: {
                x: screenshotClip.clip.x,
                y: screenshotClip.clip.y,
                width: screenshotClip.clip.width,
                height: screenshotClip.clip.height,
            },
            captureBeyondViewport: true,
            ...(args.imageType !== IMAGE_TYPES.PNG && { quality: args.enablePageScreenshotQuality })
        });
        return res;
    } catch (err) {
        ctx.logger.error(`❌ 渲染图片失败: ${err}`);
    } finally {
        await browserPage.close();
    }
}
