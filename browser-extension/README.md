# 拾页网页摘录扩展

Manifest V3 扩展。仅在用户主动点击后读取当前标签页的选中文字，并在预览、填写感想、再次确认后提交到拾页。

## 权限

- `activeTab`：用户点击扩展后临时访问当前标签页。
- `scripting`：在用户点击“读取当前标签页选区”时执行一次选区读取脚本。
- `storage`：在扩展本地保存配对码和服务地址。
- `host_permissions`：本地开发地址 `http://localhost:3000` 和 `http://127.0.0.1:3000`。
- `optional_host_permissions`：生产 HTTPS 域名按需申请，未授权时不会请求。

扩展不会读取 Cookie、浏览历史、登录凭证或未激活标签页，也不会自动抓取正文。

## 本地加载

1. 启动拾页开发服务器：`http://localhost:3000`。
2. 登录拾页，进入 `/settings`。
3. 在“浏览器扩展配对”中点击“生成配对码”，复制只显示一次的 64 位配对码。
4. 打开 Chrome：`chrome://extensions`。
5. 开启右上角“开发者模式”。
6. 点击“加载已解压的扩展程序”。
7. 选择项目中的 `browser-extension/` 目录。
8. 在浏览器工具栏打开“拾页 · 网页摘录”。
9. 确认服务地址为 `http://localhost:3000`，粘贴配对码并点击“保存并连接”。

## 完整测试流程

1. 打开一个普通 `http(s)` 网页。
2. 用鼠标选中一段文字。
3. 点击扩展图标，再点击“读取当前标签页选区”。
4. 确认标题和选中的文字出现，填写可选感想。
5. 点击“保存为私密笔记”。
6. 成功后可点击“查看已保存的笔记”。
7. 回到拾页 `/library`，确认笔记来源为网页摘录且可见范围为私密。
8. 回到 `/settings` 撤销配对码。
9. 再次用扩展提交，预期返回“配对码无效或已撤销”。

## 生产环境配置

1. 在扩展配对页面把服务地址改成生产站点，例如 `https://reading.example.com`。
2. 首次提交时 Chrome 会请求该 HTTPS 域名的访问权限；拒绝则不会发送数据。
3. 在 Next.js 服务端设置 `EXTENSION_ALLOWED_ORIGINS`，值为安装后的扩展来源，例如：
   - `EXTENSION_ALLOWED_ORIGINS=chrome-extension://abcdefghijklmnop`
   - 多个来源用英文逗号分隔。
4. 生产环境不会默认信任任意 `chrome-extension://` 来源，必须显式配置。

## API

`POST /api/extension/imports`

```http
Authorization: Bearer <64位配对码>
Content-Type: application/json
```

```json
{
  "title": "页面标题",
  "url": "https://example.com/article",
  "content": "用户主动选择的网页片段",
  "reflection": "可选个人感想"
}
```

服务端对 Token 做 SHA-256 哈希，通过 `verify_and_create_clip` RPC 验证后创建私密笔记。数据库不保存明文 Token，也不需要 `SUPABASE_SERVICE_ROLE_KEY`。

## 安全边界

- 扩展只在用户点击后读取当前标签页。
- 选中的文字为只读预览，提交前仍需用户点击确认。
- 每次摘录最多 100000 个字符，个人感想最多 20000 个字符。
- Token 只保存在 `chrome.storage.local`，不写入日志或构建产物。
- 撤销配对后，RPC 会拒绝该 Token 的后续请求。
- 同一网页可以多次摘录，每次生成独立私密笔记。
