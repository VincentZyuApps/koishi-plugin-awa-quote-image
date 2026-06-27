const pkg = require('../package.json')

export const usage = `
<h1>Koishi 插件：群u的名人名言 awa-quote-image</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-awa-quote-image" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-awa-quote-image?style=flat-square" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/koishi-plugin-awa-quote-image" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-awa-quote-image?style=flat-square" alt="npm downloads">
  </a>
  <br>
  <a href="https://github.com/VincentZyu233/koishi-plugin-awa-quote-image" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://forum.koishi.xyz/t/topic/12566" target="_blank">
    <img src="https://img.shields.io/badge/Koishi Forum-12566-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white" alt="Forum">
  </a>
  <a href="https://qm.qq.com/q/ZN7fxZ3qCq" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-1085190201-1AAD19?style=flat-square" alt="QQ群">
  </a>
  <br>
</p>

<h2 style="color: #ff4444; font-weight: 900; font-size: 24px; margin: 20px 0;">⚠️ 重要提示：需要开启 <b>puppeteer</b> 和 <b>http</b> 插件，本插件才能正常使用捏！</h2>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<p><b>💡 提示：</b>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image" target="_blank">
    前往 Gitee README 获得更佳观感 →
    <i>https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image</i>
  </a>
</p>

<hr>

<details>
<summary><h2>📖 插件详细说明（点击展开）</h2></summary>

<h2 style="color: #ff4444; font-weight: 900; font-size: 22px; margin: 20px 0; border: 2px solid #ff4444; padding: 12px; border-radius: 8px; background: rgba(255,68,68,0.08);">🚨 强烈建议保持开启「显示用户 ID」和「显示时间戳」！<br>防止有人换头像、改名字伪造聊天记录，关闭后果自负，与作者无关捏 ⚠️</h2>

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

</details>

<hr>

<h3>📜 插件许可声明</h3>
<p>🆓 本插件为开源免费项目，基于 MIT 协议开放。欢迎修改、分发、二创。🎉</p>
<p>⭐ 如果你觉得插件好用，欢迎在 GitHub 上 Star 或通过其他方式给予支持（例如提供服务器、API Key 或直接赞助）！💖</p>
<p>🙏 感谢所有开源字体与项目的贡献者 ❤️</p>
`
