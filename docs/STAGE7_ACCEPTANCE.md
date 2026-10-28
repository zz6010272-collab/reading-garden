# 阶段 7 验收报告：Chrome 网页摘录扩展

日期：2026-10-28

## 实现范围

- `extension_tokens` 配对表、用户自有 RLS 策略和撤销字段不可逆触发器。
- `verify_and_create_clip` SECURITY DEFINER RPC；不使用 `SUPABASE_SERVICE_ROLE_KEY`。
- 32 字节随机 Token，数据库只保存 SHA-256 哈希，明文只展示一次。
- `/settings` 扩展配对区：生成、一次性展示、复制、记录列表和撤销。
- `POST /api/extension/imports`：Bearer Token、CORS、JSON、字段、URL 和长度校验。
- Manifest V3 扩展：`activeTab`、`scripting`、`storage`，仅用户点击后读取选区。
- 扩展预览选区、允许填写感想、再次确认后提交，成功后打开私密笔记。
- 同一 URL 可创建多条独立摘录；文件导入和微信读书仍保留去重约束。

## 已执行检查

```text
node node_modules/typescript/bin/tsc --noEmit
结果：通过，0 个类型错误

node node_modules/eslint/bin/eslint.js .
结果：通过，0 个 error / 0 个 warning

node --import jiti/register --test tests/*.test.ts
结果：14 项测试通过，0 失败

node node_modules/next/dist/bin/next build
结果：Next.js 16.4.3 生产构建通过，15 个静态页面生成完成

node --check browser-extension/popup.js
结果：通过

manifest.json JSON 解析
结果：通过；manifest_version=3，权限为 activeTab/scripting/storage
```

本地 API 边界检查：

- `OPTIONS /api/extension/imports`：204，允许 `chrome-extension://` Origin 和 `Authorization, Content-Type` 请求头。
- 缺少 Bearer Token：401。
- 未允许的网页 Origin：403。
- 无效 Bearer Token 格式：401。
- 空标题等非法字段：400。
- 非法 JSON：400，且在调用 RPC 前拒绝。
- 未登录访问 /settings：307，跳转 /login。

## 验收结果

- 阶段 7 迁移已应用。
- Edge 浏览器真实端到端测试通过：Token 配对、选区提取、私密笔记保存均正常。
- 撤销配对 Token 后再次提交返回 401，服务端拦截符合预期。

## 手动验收步骤

1. 执行阶段 7 SQL 迁移。
2. 重启开发服务器，登录 `/settings`。
3. 点击“生成配对码”，复制一次性明文。
4. 打开 `chrome://extensions`，开启开发者模式，加载 `browser-extension/`。
5. 在扩展中填写 `http://localhost:3000` 和配对码。
6. 打开普通网页，选中一段文字，点击扩展并读取选区。
7. 确认标题和选中内容，填写感想，提交。
8. 确认笔记为私密，来源为 `extension`，同一 URL 可再次摘录。
9. 在设置页撤销配对码，再次提交应按 401 失败。

## 安全检查

- 客户端响应不包含 Token 哈希。
- 数据库不保存明文 Token。
- Token 不进入日志、分析事件或公开构建产物。
- Server API 不读取 Cookie 会话。
- RPC 固定 `search_path = ''`，只按未撤销 Token 对应的用户创建笔记。
- 扩展不读取 Cookie、历史记录、登录凭证或未激活标签页。
