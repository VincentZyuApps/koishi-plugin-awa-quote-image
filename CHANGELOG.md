# 更新日志

## 0.2.13-beta.9+20260704

### ✨ 新功能

- 🎯 新增 `atRenderMode` 配置项，用于控制引用消息中的 `@` 消息段渲染方式：
  - `none`：不渲染 `@` 消息段
  - `nick`：渲染群昵称 / 群名片
  - `username`：渲染用户名
- 🧩 引用消息内容改为使用 Koishi/Satori 的 `h.parse()` 解析消息元素，支持以更通用的消息元素方式处理 `<at id="..."/>`。
- 📚 新增 OneBot session 样例文档，记录 `nick` / `name` / `username` 等字段来源，便于后续排查适配器行为。

### 🔧 改进

- 📦 package.json 版本升级到 `0.2.13-beta.9+20260704`
- 🏷️ 将 `onebotNameStyle` 重命名为 `nameStyle`，并同步更新 README 配置表，避免把用户名显示策略误解为 OneBot 专属配置。
- 🔁 `@` 段解析增加群成员信息查询缓存，同一条消息内重复提及同一用户时不再重复请求成员资料。
- 🧼 将引用消息的干净文本与图片渲染文本分离：`quoteData.content` 保持无零宽字符，用于日志和 QQ Markdown；图片出图单独使用可带断点的渲染文本。
- 📁 将 `src/type.ts` 重命名为 `src/types.ts`，并同步更新相关 import。

### 🐛 修复

- 💬 修复引用消息中的 `@` 消息段在图片里被浏览器当作 HTML 标签吞掉、无法显示的问题。
- ↩️ 为较长的 `@` 昵称 / URL 型群名片插入不可见断点，减少长 `@` 段整体被挤到下一行开头的问题。
- 🛡️ 补充 HTML 文本 escape，避免 `<at/>`、`<test>`、`&` 等用户文本被浏览器当作 HTML 解析。

### ✅ 验证

- `yarn yakumo build awa-quote-image`

---

## 0.2.10-rc.3+20260630

### 🔧 改进

- 📦 package.json 版本升级到 `0.2.10-rc.3+20260630`
- 🧹 `src/config.ts` 配置接口重构：JSDoc 块注释改为行内注释，字段按功能分组（基础/会话/渲染/QQ Bot/调试）
- 🧹 清理所有 logger 输出中的 `[${PLUGIN_NAME}]` / `[awa-quote-image]` 插件名前缀
- ✨ 所有源码 logger 输出统一改为 emoji 开头，方便在 Koishi 控制台快速定位日志类型
- 🔍 verbose 调试日志保留详细上下文，但 console 输出不再混入插件名前缀

### 🐛 修复

- 🔧 修复 `imageStyleDetails` 第 4 项（QQ 气泡样式）默认字体被错误配置为思源字体的问题，改为文楷字体
- 🖼️ 修复 Puppeteer 渲染错误日志缺少明确错误前缀的问题
- 📁 修复字体 base64 读取失败日志格式不统一的问题

---

## 0.2.10-rc.1+20260628

### 🔧 改进

- 📦 package.json 版本从 `0.2.10-beta.1+20260628` 升级到 `0.2.10-rc.1+20260628`
- 🧹 清理运行时 logger 文案，去掉 `[awa-quote-image]` / `[${PLUGIN_NAME}]` / `[${pluginName}]` 这类插件名前缀
- ✨ 所有源码 logger 输出统一改为 emoji 开头，方便在 Koishi 控制台快速定位日志类型
- 🔍 verbose 调试日志保留详细上下文，但 console 输出不再混入插件名前缀

### 🐛 修复

- 🖼️ 修复 Puppeteer 渲染日志缺少明确错误前缀的问题
- 📁 修复字体 base64 读取失败日志格式不统一的问题

---

## 0.2.10-beta.1+20260628

### ✨ 新功能

- 😀 新增 `TwemojiCOLRv0.ttf` release 字体支持，默认随插件启动自动检查、下载并校验
- ⚙️ 新增 `enableReleaseEmojiFont` 配置项，允许关闭插件内置 Twemoji 注入并改用系统 emoji 字体 fallback
- 📁 新增 `emojiFontPath` 配置项，默认展示 `process.cwd()/data/fonts/TwemojiCOLRv0.ttf`，运行时映射到 `ctx.baseDir/data/fonts/TwemojiCOLRv0.ttf`

### 🔧 改进

- 🧪 emoji 字体相关配置标记为实验性，并在配置说明里提示生产环境更建议使用系统 emoji 字体
- 📚 README / usage 补充 Twemoji 下载地址，以及 Debian / Ubuntu 安装系统 emoji 字体的示例命令
- 🧾 README 补充 Gitee / GitHub release 手动下载说明

### 🐛 修复

- 🎨 为 `TwemojiCOLR` 字体注入增加 `unicode-range`，限制它只接管 emoji 码位
- 🔢 修复开启 release emoji 字体后，数字、`userId`、时间戳等普通字符可能被 Twemoji 字体吞掉的问题

---

## 0.2.9-rc.1+20260628

### ✨ 新功能

- 🌐 字体下载新增 GitHub release fallback：优先 Gitee，失败后自动尝试 GitHub
- 🧩 默认字体下载逻辑统一放入 `src/utils.ts`

### 🔧 改进

- 📦 package.json 版本升级到 `0.2.9-rc.1+20260628`
- 🚀 `apply()` 阶段预检查字体，指令执行前再次复核，避免渲染时才发现字体缺失
- 🛑 字体下载或校验失败时停止渲染，并提示检查 Gitee / GitHub release 访问能力或手动放置字体
- 📚 README / usage 同步更新自动下载、fallback 和手动下载说明

---

## 0.2.8-beta.15+20260628

### 🔐 完整性校验

- ✅ 为 `SourceHanSerifSC-SemiBold.otf` 和 `LXGWWenKaiMono-Regular.ttf` 增加 size、md5、sha1、sha256、sha512 校验
- 📥 下载后必须立刻通过完整性校验，全部通过才视为下载成功
- 🔁 默认字体存在但校验失败时自动重新下载
- 📂 默认字体运行时统一读取 Koishi 运行目录的 `data/fonts`

---

## 0.2.7-beta.13+20260628

### ✨ 新功能

- 新增 QQ 引用缓存模式配置：`qqQuoteCacheMode`
  - `database`：默认模式，使用 Koishi database 服务保存 REFIDX 引用缓存
  - `memory`：仅使用内存缓存，重启后清空
- package.json 声明 `database` 为可选服务，`puppeteer` / `http` 仍为必需服务
- QQ 平台引用解析失败提示优先使用 QQ Markdown 发送

### 🔧 改进

- QQ 平台严格使用被引用消息作者的头像和用户名，不再 fallback 到触发 `aqt` 指令的用户
- 获取不到被引用消息作者完整 `content / userId / username / avatar` 时，直接在 console 和会话报错并停止渲染
- QQ 官方 Bot 头像配置统一改为 `qqBotAppId`，语义对齐 `q.qlogo.cn/qqapp/{appId}/{openid}/640`
- database 表注册改为 `ctx.inject(['database'], ...)`，避免在 `apply()` 顶层用 `ctx.database` 判断服务状态
- 字体运行时路径迁移到 Koishi 运行目录的 `data/fonts`
- README、usage、QQ 适配开发文档同步更新当前 QQ 严格解析策略

### 🐛 修复

- 修复 QQ 平台引用他人消息时头像和用户名可能错误显示为触发者的问题
- 修复 QQ 引用作者信息缺失时仍继续渲染的风险
- 清理旧 AppId 配置名的文案与配置残留

---

## 0.2.1-beta.2+20260626

### ✨ 新功能

- **QQ 官方适配器引用消息支持**：新增 `src/qq.ts`，`resolveQQData()` 从 `message_scene.ext` + `msg_elements[0]` 解析引用消息，内存级 LRU 200 缓存
- **新增配置项**：
  - `qqBotAppId` — QQ 官方 Bot AppId，用于头像地址拼接
  - `enableQQMarkdown` — 是否在 QQ 平台发送 Markdown 按钮消息
  - `qqMarkdownKeyboardJson` — 自定义 Markdown 按钮 JSON

### 🔧 改进

- **重构 `do_aqt` 为三优先调度**：`session.quote` > QQ 自救 > 报错
- **头像地址**：支持 `config.qqBotAppId` → fallback `bot.config.id`，统一 HTTPS
- **`renderAndSend` 分离**：`preUserObj` 绕过 `getUser` 缺失平台
- **`config.ts` 分组重排**：基础/会话/渲染/QQ/调试，interface 对齐 schema
- **合并 `qq_markdown.ts` 至 `src/qq.ts`**
- **新增 `src/utils.ts`**：提取 `checkAndDownloadFonts` / `fileToBase64` / `downloadFont`

---

## 0.1.7

### ✨ 新功能

- 新增 `--no-newlines` 参数，默认保留原始消息换行，使用该参数可折叠换行为单行
- usage 页面重设计：badge 徽章 + 可折叠详情

### 🔧 改进

- 统一 `PageScreenshotquality` → `pageScreenshotQuality` / `enablePageScreenshotQuality`
- 修复硬编码 `QQ_BUBBLE` 引用为 `IMAGE_STYLE_KEY_ARR[3]`
- 修复 `deleteMessage` 参数类型（guildId → channelId）
- 提取 Config 与 usage 至独立文件，`index.ts` 瘦身 -263 行
- 修复 TS2742 build 错误（Config 添加显式类型注解）

---

## 0.1.6

### ✨ 新功能

- **新增 QQ 消息气泡样式 💬**：模仿 QQ 原生消息卡片外观
- **群头衔/群等级显示 🏷️**：支持显示群主/管理员/自定义头衔 + 等级徽章（仅 OneBot + QQ 气泡样式）

### 🔧 改进

- 重构 QQ 气泡模板，CSS 压行并合并函数
- 更新示例图片与部署文档

---

## 0.1.5

### ✨ 新功能

- 新增 `showUserId` 全局配置项
- 新增 `showTimestamp` 全局配置项
- 防伪造警告提示（关闭需自行承担后果）

### 🔧 改进

- 更新 QQ 群号：259248174 → 1085190201

---

## 0.1.4

### ✨ 新功能

- `onebotNameStyle` 改为四选一配置：`name-only` / `card-only` / `name-card` / `card-name`
- 全局配置注释/description 加 emoji

---

## 0.1.3

### 🐛 修复

- 修复 `enableWatingHint` 配置项不生效的问题
- 引用回复应用到图片/参数消息

---

## 0.1.2

### ✨ 新功能

- 新增图片中强制展示 `userId`，防止换头像改名伪造聊天记录
- 样式索引合法范围校验（`config.imageStyleDetails.length` 动态边界）
- readme 添加 npm-download 徽章
- readme 添加字体下载链接
- 新增 `prod.md`

### 🔧 改进

- `getUser` 调用改为 `session.channelId` 而非 `session.quote.channel.id`
- 取消 git 追踪两个字体文件

---

## 0.1.1

### ✨ 新功能

- 首次发布版本号规范化（`-beta` / `-alpha` / `-rc`）

---

## 0.1.0

### ✨ 新功能

- 最初版本发布
  - 回复消息 → 渲染名人名言图片
  - 两种样式：原始黑底白字、现代思源宋体
  - 多种图片格式支持
  - 自动下载字体
