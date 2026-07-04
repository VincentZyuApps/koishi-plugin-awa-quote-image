# 更新日志

## 0.3.0-beta.13+20260704

### 🧱 重构

- 📦 package.json 版本升级到 `0.3.0-beta.13+20260704`。
- 🧩 拆分主流程：
  - `src/index.ts` 精简为插件入口、字体预检查、QQ 缓存初始化和命令注册编排。
  - 新增 `src/commands/acs.ts`，集中注册样式列表指令。
  - 新增 `src/commands/aqt.ts`，集中保留 `aqt` 主渲染流程。
  - 新增 `src/quote.ts`，集中处理引用消息段解析、`@` 渲染、图片/表情 HTML 渲染。
  - 新增 `src/user.ts`，集中处理用户资料、群名片显示、群头衔/等级徽章和头像下载。
- 🎨 拆分渲染模板：
  - 将四个 HTML/CSS 模板从 `src/render.ts` 拆到 `src/template/`。
  - `render.ts` 仅保留 Puppeteer 出图、截图裁剪和模板分发逻辑。
  - 模板 CSS 改为多行格式，后续调整样式时更容易定位。
- 🤖 拆分 QQ 官方 Bot 逻辑：
  - 删除顶层 `src/qq.ts`。
  - 新增 `src/qq/` 目录，拆分为 `qq-button.ts`、`qq-markdown.ts`、`qq-cache.ts`、`qq-resolve.ts`、`qq-debug.ts`、`qq-types.ts`、`qq-utils.ts`。
  - 保留 `src/qq/index.ts` 聚合导出，维持 `from './qq'` 的调用方式。

### ✨ 新功能

- 🧲 新增 `inlineMediaAlign` 配置项，用于控制引用消息中图片 / 表情与文字的垂直对齐方式：
  - `top`：顶部对齐
  - `middle`：中部对齐
  - `bottom`：底部对齐，默认值，用于恢复旧版更接近底部对齐的观感
- 📦 新增 `qqQuoteCacheLimitPerChannelid` 配置项：
  - 默认 `500`
  - 范围 `10` - `1000000`
  - 用于控制每个 `channel_id` 的 QQ 引用缓存条数上限

### 🔧 改进

- 💾 QQ 引用缓存改为按 `channel_id` 分桶：
  - 内存缓存使用 scoped key，避免不同频道 / 群的 REFIDX 互相覆盖。
  - database 表新增 `channel_id` 字段。
  - database 主键改为 `channel_id + ref_idx`。
  - 内存缓存和 database 缓存都会按每个 `channel_id` 裁剪超限旧记录。
- 💬 QQ 气泡样式调整：
  - 保持最终输出宽度不变。
  - 缩小容器四周内边距和头像间距。
  - 放宽消息气泡可用宽度，让内容面积占比更大。
- 📚 README 和 usage 同步补充 `inlineMediaAlign`、`qqQuoteCacheLimitPerChannelid` 等新增配置说明。

### ✅ 验证

- `yarn build awa-quote-image`
- `git diff --check`

---

## 0.2.13-beta.10+20260704

### 🐛 修复

- 🖼️ 修复 `atRenderMode` 改造后引用消息出图内容被整体纯文本化的问题。
  - 回归表现：原本可以渲染的图片、QQ 表情、动画表情退化成 `[图片]`、`[动画表情]`、`[表情描述]` 这类纯文本占位。
  - 根因：`atRenderMode` 引入时为了处理 `@` 消息段，把引用消息元素统一转成纯文本，导致 `img` / `image` / `face` / `emoji` / `mface` 等非文本消息段也丢失了出图 HTML 表达能力。
- 🔁 将引用消息内容拆成三路输出，避免日志、Markdown 和 Puppeteer 出图互相污染：
  - `content`：干净纯文本，用于日志、QQ Markdown 和调试。
  - `renderContent`：用于长度估算和普通渲染文本，可保留为了换行插入的零宽断点。
  - `renderContentHtml`：用于 Puppeteer 出图，由白名单消息段生成受控 HTML。
- 🧩 限定 `atRenderMode` 只影响 `at` 消息段，不再影响图片、QQ 表情、动画表情等其他消息段。
- 🖼️ 恢复 `img` / `image` 段资源渲染：
  - 优先读取 `src` / `url` / `file`。
  - 生成受控 `<img class="quote-inline-image">`。
  - 无可用资源时才 fallback 为 `[图片]`。
- 😀 恢复 `face` / `emoji` / `mface` 段资源渲染：
  - 优先读取自身资源 URL。
  - 若自身没有资源，则尝试读取子级 `img` 资源。
  - 无可用资源时才 fallback 为表情描述文本。
- 🛡️ 补充出图 HTML 安全处理：
  - 普通文本继续 HTML escape。
  - 只允许 `http`、`https`、`data:image`、`file`、`base64://` 资源进入图片渲染。
  - 将 `base64://` 转换为浏览器可渲染的 `data:image/png;base64,...`。
- 📐 为内联图片、QQ 表情、动画表情补充布局样式，避免资源撑爆引用内容区域。

### 🔧 改进

- 📦 package.json 版本升级到 `0.2.13-beta.10+20260704`。
- 📝 package 描述补充黑白样式说明。

### ✅ 验证

- `yarn build awa-quote-image`
- `git diff --check`

---

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
