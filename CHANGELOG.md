# 更新日志

## 0.2.1-beta.2+20260626

### ✨ 新功能

- **QQ 官方适配器引用消息支持**：新增 `src/qq.ts`，`resolveQQData()` 从 `message_scene.ext` + `msg_elements[0]` 解析引用消息，内存级 LRU 200 缓存
- **新增配置项**：
  - `qqBotUin` — QQ 官方 Bot 机器人 UIN，用于头像地址拼接
  - `enableQQMarkdown` — 是否在 QQ 平台发送 Markdown 按钮消息
  - `qqMarkdownKeyboardJson` — 自定义 Markdown 按钮 JSON

### 🔧 改进

- **重构 `do_aqt` 为三优先调度**：`session.quote` > QQ 自救 > 报错
- **头像地址**：支持 `config.qqBotUin` → fallback `bot.config.id`，统一 HTTPS
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
