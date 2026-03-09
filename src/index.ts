import { Context, h, Schema } from 'koishi'
import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

import {} from 'koishi-plugin-adapter-onebot';

import { renderQuoteImage } from './render';
import { IMAGE_STYLES, ImageStyleKey, IMAGE_STYLE_KEY_ARR, IMAGE_TYPES, ImageType } from './type';

export const inject = {
    required: ["puppeteer", "http"]
};

export const name = 'awa-quote-image';
const PLUGIN_NAME = name;

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
)


export const usage = `
<h1>🎭 Koishi 插件: 群u的名人名言 ${PLUGIN_NAME} 🎭</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<h2 style="color: #ff4444; font-weight: 900; font-size: 24px; margin: 20px 0;">⚠️ 重要提示：需要开启 <b>puppeteer</b> 和 <b>http</b> 插件，本插件才能正常使用捏！</h2>

<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了</del> </p> 
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>


<h2 style="color: #ff4444; font-weight: 900; font-size: 22px; margin: 20px 0; border: 2px solid #ff4444; padding: 12px; border-radius: 8px; background: rgba(255,68,68,0.08);">🚨 强烈建议保持开启「显示用户 ID」和「显示时间戳」！<br>防止有人换头像、改名字伪造聊天记录，关闭后果自负，与作者无关捏 ⚠️</h2>

<hr>

<p>📦 插件仓库地址：</p>
<ul>
  <li>🟠 <a href="https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image">https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image</a></li>
  <li>⚫ <a href="https://github.com/VincentZyu233/koishi-plugin-awa-quote-image">https://github.com/VincentZyu233/koishi-plugin-awa-quote-image</a></li>
</ul>

<hr>

<h3>🎨 字体使用声明</h3>
<p>本插件使用以下开源字体进行图像渲染：</p>
<ul>
  <li>📝 <b>思源宋体（Source Han Serif SC）</b> - 由 Adobe 与 Google 联合开发，遵循 <a href="https://openfontlicense.org">SIL Open Font License 1.1</a> 协议。</li>
  <li>✍️ <b>霞鹜文楷（LXGW WenKai）</b> - 由 LXGW 开发并维护，遵循 <a href="https://openfontlicense.org">SIL Open Font License 1.1</a> 协议。</li>
</ul>
<p>🆓 两者均为自由字体，可在本项目中自由使用、修改与发布。若你也在开发相关插件或项目，欢迎一同使用这些优秀的字体。✨</p>


<h3>📥 字体文件获取说明</h3>
<p>🤖 插件会在首次使用时自动下载所需字体文件。如果自动下载失败，请手动下载字体文件：</p>
<ul>
  <li>🔗 字体下载地址：<a href="https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/tag/fonts">https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/tag/fonts</a></li>
  <li>📁 下载后请将字体文件放入插件的 <code>assets</code> 文件夹中</li>
  <li>📋 需要的字体文件：<code>SourceHanSerifSC-SemiBold.otf</code> 和 <code>LXGWWenKaiMono-Regular.ttf</code></li>
</ul>

<hr>

<h3>📜 插件许可声明</h3>
<p>🆓 本插件为开源免费项目，基于 MIT 协议开放。欢迎修改、分发、二创。🎉</p>
<p>⭐ 如果你觉得插件好用，欢迎在 GitHub 上 Star 或通过其他方式给予支持（例如提供服务器、API Key 或直接赞助）！💖</p>
<p>🙏 感谢所有开源字体与项目的贡献者 ❤️</p>
`

// 🎨 图片样式细节配置项
export interface ImageStyleDetail {
  /** 🖌️ 图片渲染样式 key */
  styleKey: ImageStyleKey
  /** 📁 字体文件路径 */
  fontPath: string
  /** 🌙 是否启用深色模式 */
  darkMode: boolean
}

// ⚙️ 插件全局配置接口
export interface Config {
  /** 📋 acs 指令名称 —— 查看图片样式列表 */
  acsCommandName: string
  /** 🎨 aqt 指令名称 —— 制作名人名言图片 */
  aqtCommandName: string

  /** 🎭 Onebot 平台用户名显示样式 */
  onebotNameStyle: 'name-only' | 'card-only' | 'name-card' | 'card-name'
  /** 🆔 是否在图片中显示用户 ID */
  showUserId: boolean
  /** 🕐 是否在图片中显示时间戳 */
  showTimestamp: boolean
  /** 💬 是否引用触发指令的消息 */
  enableQuote: boolean
  /** ⏳ 是否显示「渲染中，请等待...」提示 */
  enableWatingHint: boolean

  /** 🖼️ 图片样式细节列表（table 配置） */
  imageStyleDetails: ImageStyleDetail[]
  /** 📐 渲染图片宽度 */
  imageWidth: number
  /** 📏 渲染图片最小高度 */
  imageMinHeight: number
  /** 📤 输出图片类型 */
  imageType: ImageType
  /** 🎚️ 截图质量参数 */
  PageScreenshotquality: number

  /** 🐛 是否在会话中输出调试信息 */
  verboseSessionLog: boolean
  /** 🐛 是否在控制台输出调试信息 */
  verboseConsoleLog: boolean
}

// 📝 配置项 Schema 定义
export const Config = Schema.intersect([
    // ─── 📌 基础配置 ───
    Schema.object({
        acsCommandName: Schema
            .string()
            .default('名人名言图片样式列表')
            .description('📋 acs 指令名称 —— 查看图片样式列表'),
        aqtCommandName: Schema
            .string()
            .default('名人名言')
            .description('🎨 aqt 指令名称 —— 制作名人名言图片'),
    }).description('📌 基础配置 ⚙️'),

    // ─── 💬 会话设置 ───
    Schema.object({
        onebotNameStyle: Schema
            .union([
                Schema.const('name-only').description('🏷️ 只显示用户名'),
                Schema.const('card-only').description('🪪 只显示群卡片【仅onebot】'),
                Schema.const('name-card').description('🏷️🪪 用户名（群卡片）【仅onebot】'),
                Schema.const('card-name').description('🪪🏷️ 群卡片（用户名）【仅onebot】'),
            ])
            .role('radio')
            .default('name-card')
            .description('🎭 Onebot 平台用户名显示样式（非 Onebot 平台始终显示用户名）'),
        showUserId: Schema
            .boolean()
            .default(true)
            .description('🆔 是否在图片中显示用户 ID —— **强烈建议保持开启**，防止换名换头像伪造聊天记录，关闭后果自负，与作者无关 ⚠️'),
        showTimestamp: Schema
            .boolean()
            .default(true)
            .description('🕐 是否在图片中显示时间戳 —— **强烈建议保持开启**，防止篡改时间伪造聊天记录，关闭后果自负，与作者无关 ⚠️'),
        enableQuote: Schema
            .boolean()
            .default(true)
            .description('💬 bot 发送消息时，是否引用触发消息的指令'),
        enableWatingHint: Schema
            .boolean()
            .default(true)
            .description('⏳ 是否启用「渲染中，请等待...」提示消息'),
    }).description('💬 会话设置 ⚙️'),

    // ─── 🖼️ 图片渲染配置 ───
    Schema.object({
        imageStyleDetails: Schema
            .array(
                Schema.object({
                    styleKey: Schema
                        .union(IMAGE_STYLE_KEY_ARR.map((key) => Schema.const(key).description(IMAGE_STYLES[key])))
                        .role('radio')
                        .description("🖌️ 图片样式"),
                    fontPath: Schema
                        .string()
                        .description("📁 字体文件路径"),
                    darkMode: Schema
                        .boolean()
                        .description("🌙 启用深色模式"),
                })
            )
            .role('table')
            .default([
                {
                    styleKey: IMAGE_STYLE_KEY_ARR[0],
                    fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
                    darkMode: false,
                },
                {
                    styleKey: IMAGE_STYLE_KEY_ARR[0],
                    fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
                    darkMode: true,
                },
                {
                    styleKey: IMAGE_STYLE_KEY_ARR[1],
                    fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
                    darkMode: false,
                },
                {
                    styleKey: IMAGE_STYLE_KEY_ARR[1],
                    fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
                    darkMode: true,
                },
                {
                    styleKey: IMAGE_STYLE_KEY_ARR[2],
                    fontPath: path.resolve(__dirname, '../assets/LXGWWenKaiMono-Regular.ttf'),
                    darkMode: false,
                },
                {
                    styleKey: IMAGE_STYLE_KEY_ARR[2],
                    fontPath: path.resolve(__dirname, '../assets/LXGWWenKaiMono-Regular.ttf'),
                    darkMode: true,
                },
            ])
            .description("🎨 图片样式列表 —— 第一行为默认配置，其余可用 aqt -i 索引指定"),
        imageWidth: Schema
            .number()
            .default(1920)
            .description("📐 默认图片宽度（px）"),
        imageMinHeight: Schema
            .number()
            .default(1080)
            .description("📏 默认最小图片高度（px）"),
        imageType: Schema.union([
            Schema.const(IMAGE_TYPES.PNG).description(`🖼️ ${IMAGE_TYPES.PNG}, ❌ 不支持调整 quality`),
            Schema.const(IMAGE_TYPES.JPEG).description(`🌄 ${IMAGE_TYPES.JPEG}, ✅ 支持调整 quality`),
            Schema.const(IMAGE_TYPES.WEBP).description(`🌐 ${IMAGE_TYPES.WEBP}, ✅ 支持调整 quality`),
            ])
            .role('radio')
            .default(IMAGE_TYPES.PNG)
            .description("📤 渲染图片的输出格式"),
        PageScreenshotquality: Schema
            .number()
            .role('slider')
            .min(0).max(100).step(0.1)
            .default(60)
            .description("🎚️ Puppeteer 截图质量 [0-100]，对 PNG 无效")
    })
        .description("🖼️ 图片渲染配置"),

    // ─── 🐛 调试设置 ───
    Schema.object({
        verboseSessionLog: Schema
            .boolean()
            .default(false)
            .description('🐛 在会话中输出详细参数信息'),
        verboseConsoleLog: Schema
            .boolean()
            .default(false)
            .description('🐛 在控制台输出详细参数信息'),
    })
        .description("🐛 调试设置 🔧")
]);

export function apply(ctx: Context, config: any) {
    const IMAGE_STYLE_VALUES = Object.values(IMAGE_STYLES);
    const IMAGE_STYLE_KEYS = Object.keys(IMAGE_STYLES) as ImageStyleKey[];

    // 检查字体文件并下载
    async function checkAndDownloadFonts() {
        const assetsDir = path.resolve(__dirname, '../assets');
        const sourceHanSerifPath = path.join(assetsDir, 'SourceHanSerifSC-SemiBold.otf');
        const lxgwWenKaiPath = path.join(assetsDir, 'LXGWWenKaiMono-Regular.ttf');
        
        const sourceHanSerifExists = existsSync(sourceHanSerifPath);
        const lxgwWenKaiExists = existsSync(lxgwWenKaiPath);
        
        if (sourceHanSerifExists && lxgwWenKaiExists) {
            ctx.logger.info(`[${PLUGIN_NAME}] 字体文件已存在，跳过下载`);
            return true;
        }
        
        ctx.logger.info(`[${PLUGIN_NAME}] 开始下载字体文件...`);
        
        // 确保assets目录存在
        try {
            await mkdir(assetsDir, { recursive: true });
        } catch (error) {
            ctx.logger.error(`[${PLUGIN_NAME}] 创建assets目录失败: ${error}`);
            return false;
        }
        
        const downloadPromises = [];
        
        if (!sourceHanSerifExists) {
            ctx.logger.info(`[${PLUGIN_NAME}] 下载 SourceHanSerifSC-SemiBold.otf...`);
            const downloadPromise = downloadFont(
                'http://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/SourceHanSerifSC-SemiBold.otf',
                sourceHanSerifPath
            );
            downloadPromises.push(downloadPromise);
        }
        
        if (!lxgwWenKaiExists) {
            ctx.logger.info(`[${PLUGIN_NAME}] 下载 LXGWWenKaiMono-Regular.ttf...`);
            const downloadPromise = downloadFont(
                'http://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/LXGWWenKaiMono-Regular.ttf',
                lxgwWenKaiPath
            );
            downloadPromises.push(downloadPromise);
        }
        
        try {
            await Promise.all(downloadPromises);
            ctx.logger.info(`[${PLUGIN_NAME}] 字体文件下载完成`);
            return true;
        } catch (error) {
            ctx.logger.error(`[${PLUGIN_NAME}] 字体文件下载失败: ${error}`);
            return false;
        }
    }

    // 使用ctx.http下载字体文件（简单模式）
    async function downloadFont(url: string, filePath: string): Promise<void> {
        const fileName = path.basename(filePath);
        
        try {
            ctx.logger.info(`[${PLUGIN_NAME}] 开始下载字体文件: ${fileName}`);
            const response = await ctx.http.get(url, { 
                responseType: 'arraybuffer',
                timeout: 60000 // 60秒超时
            });
            await writeFile(filePath, Buffer.from(response));
            ctx.logger.info(`[${PLUGIN_NAME}] 字体文件下载成功: ${fileName} ✓`);
        } catch (error) {
            ctx.logger.error(`[${PLUGIN_NAME}] 字体文件下载失败 ${fileName}: ${error}`);
            throw error;
        }
    }

    // 立即注册 acs 指令
    ctx.command(
        config.acsCommandName,
        "名人名言图片样式列表"
    )
        .alias("acs")
        .action(async ({ session }) => {
            let msg = '名人名言——' + config.aqtCommandName + '指令 的 图片样式列表：\n';
            // for (let i = 0; i < IMAGE_STYLE_VALUES.length; i++) {
            //     msg += `\t【${i}】: ${IMAGE_STYLE_KEYS[i]} -> ${IMAGE_STYLE_VALUES[i]}\n`;
            // }
            for ( let i=0; i<config.imageStyleDetails.length; i++ ){
                const o = config.imageStyleDetails[i];
                msg += `\t 【${i}】: ${IMAGE_STYLES[o.styleKey]} ${o.darkMode ? '深色模式' : '浅色模式' } (${o.styleKey}) \n`
            }
            await session.send(msg);
        });

    // 异步检查字体文件并注册 aqt 指令
    checkAndDownloadFonts().then((success) => {
        if (success) {
            ctx.command(
                config.aqtCommandName,
                "回复/引用某个群u说的话, 制作名人名言图片"
            )
                .alias("aqt")
                .option("imageStyleIdx", "-i, --idx, --index <idx:number> 图片样式索引")
                .option("enableDarkMode", "-d, --dark, --darkmode <enableDarkMode:string> 启用深色模式")
                .option("verbose", "-v, --verbose 在session和console打印详细参数信息")
                .action(async ({ session, options }) => {
                    try{
                        do_aqt({session, options});
                    } catch (error) {
                        let errorMsg = `渲染群u名人名言失败。\n\t error = ${error}`;
                        if ( config.verboseSessionLog || options.verbose )
                            await session.send(errorMsg);
                        if ( config.verboseConsoleLog || options.verbose )
                            ctx.logger.info(errorMsg);
                    }
                });
            ctx.logger.info(`[${PLUGIN_NAME}] aqt 指令注册完成`);
        } else {
            ctx.logger.warn(`[${PLUGIN_NAME}] 字体文件不可用，aqt 指令未注册`);
        }
    });

    async function do_aqt( {session, options} ){
        if (!session.quote){
            await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}请先回复/引用一条消息。`);
            return;
        }


        const waitingHintMsgId = config.enableWatingHint
            ? await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}渲染中，请等待...`)
            : null;

        const FALLBACK_STYLE_DETAIL_OBJ = {
            styleKey: IMAGE_STYLE_KEY_ARR[0],
            fontPath: path.resolve(__dirname, '../assets/SourceHanSerifSC-SemiBold.otf'),
            darkMode: true,
        }

        // 获取配置项中的第一行， 如果配置项arr是空，那么用FALLBACK
        const defaultStyleDetailObj = config.imageStyleDetails.length > 0?
            config.imageStyleDetails[0] :
            FALLBACK_STYLE_DETAIL_OBJ;
        let selectedStyleDetailObj = defaultStyleDetailObj;
        if (options.imageStyleIdx !== undefined) {
            // 发现传了index，那么进行index参数校验
            const isIdxValid: boolean = (options.imageStyleIdx as number) >= 0
                && (options.imageStyleIdx as number) < config.imageStyleDetails.length;
            if (!isIdxValid) {
                let idxInvalidMsgArr = [
                    `图片样式索引不合法。`,
                    `\t 合法范围：[0, ${config.imageStyleDetails.length - 1}]双闭区间。`,
                    `\t 当前输入：${options.imageStyleIdx}`,
                    `\n`,
                    `大笨蛋？输入指令 ${config.acsCommandName} 查看图片样式列表(*╹▽╹*)。`
                ];
                await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${idxInvalidMsgArr.join('\n')}`);
                return;
            }
            selectedStyleDetailObj = config.imageStyleDetails[options.imageStyleIdx as number];
        } else {
            // 没有传index，那么使用配置项中的第一行
            if ( config.imageStyleDetails.length === 0 ){
                let configErrMsg = `${PLUGIN_NAME}[ERROR]配置项中 图片样式细节配置arr是空， 请检查配置项。`;
                await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${configErrMsg}`);
                ctx.logger.info(configErrMsg);
            }
        }

        let selectedEnableDarkMode = selectedStyleDetailObj.darkMode;
        if ( options.enableDarkMode !== undefined ) {
            // ctx.logger.info(`options.enableDarkMode = ${options.enableDarkMode}`);
            if ( options.enableDarkMode.toLowerCase() === 'true')
                selectedEnableDarkMode = true;
            if ( options.enableDarkMode.toLowerCase() === 'false')
                selectedEnableDarkMode = false;
        }


        // const session_user_obj = await session.bot.getUser(session.quote.user.id, session.quote.guild.id);
        // const session_user_obj = await session.bot.getUser(session.quote.user.id, session.quote.channel.id);
        const session_user_obj = await session.bot.getUser(session.quote.user.id, session.channelId); //目前onebot discord可以这样用，但是telegram不行 qwq
        let usernameArg = session_user_obj.name;
        if (config.onebotNameStyle !== 'name-only' && session.onebot) {
            const onebot_groupmember_obj = await session.onebot.getGroupMemberInfo(session.quote.guild.id, session.quote.user.id);
            const onebot_groupcard = onebot_groupmember_obj.card;
            if (onebot_groupcard && onebot_groupcard.length > 0) {
                switch (config.onebotNameStyle) {
                    case 'card-only':
                        usernameArg = onebot_groupcard;
                        break;
                    case 'name-card':
                        usernameArg = `${session_user_obj.name}（${onebot_groupcard}）`;
                        break;
                    case 'card-name':
                        usernameArg = `${onebot_groupcard}（${session_user_obj.name}）`;
                        break;
                }
            }
        }

        const avatar_buffer = await ctx.http.file(session_user_obj.avatar);
        const avatar_base64 = Buffer.from(avatar_buffer.data).toString('base64');
        const font_base64 = await fileToBase64(selectedStyleDetailObj.fontPath);

        const argMsgArr = [
            `${config.enableQuote ? h.quote(session.messageId) : ''}${PLUGIN_NAME} 参数信息`,
            `\t 选中的图片样式细节: ${JSON.stringify(selectedStyleDetailObj)}`,
            `\t 选中的是否黑暗模式: ${selectedEnableDarkMode}`,
            `\t 用户名：${usernameArg}`,
            `\t 引用消息内容：${session.quote.content.slice(0, 100)}...`,
            `\t 用户头像：${h.image(session_user_obj.avatar)}`,
        ];
        const argsMsg = argMsgArr.join('\n');

        if (config.verboseSessionLog || options.verbose)
            await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${argsMsg}`);
        if (config.verboseConsoleLog || options.verbose)
            ctx.logger.info(argsMsg);

        const res = await renderQuoteImage(
            ctx,
            {
                sentence: session.quote.content,                username: usernameArg,                                  userId: session.quote.user.id,   avatarBase64: avatar_base64,
                width: config.imageWidth,                       minHeight: config.imageMinHeight,
                selectedStyle: selectedStyleDetailObj.styleKey, fontBase64: font_base64,                                enableDarkMode: selectedEnableDarkMode,
                imageType: config.imageType,                    pageScreenshotquality: config.PageScreenshotquality,
                showUserId: config.showUserId !== false,        showTimestamp: config.showTimestamp !== false,
            }
        );
        await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${h.image(`data:image/${config.imageType};base64,${res}`)}`)

        waitingHintMsgId && await session.bot.deleteMessage(session.guildId, waitingHintMsgId);
    }

    async function fileToBase64(filePath: string): Promise<string> {
        try {
            const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, filePath);
            const buffer = await readFile(absolutePath);
            return buffer.toString('base64');
        } catch (error) {
            ctx.logger.error(`[${PLUGIN_NAME}]文件转换成base64失败: ${error.message}`);
            throw error;
        }
    }

}