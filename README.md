# 拾页 / Reading Garden

个人阅读知识库 + 轻量读书社区。阶段 0–7 已完成，当前进入阶段 8 的全项目安全测试与上线准备。

## 技术栈

- Next.js 16 App Router + React 19
- TypeScript strict
- Tailwind CSS 4 + shadcn/ui
- Supabase Auth / Postgres / RLS / 私有 Storage
- 官方微信读书 Agent Skill + API Gateway

## 环境要求

- Node.js >= 20.9
- npm
- 可用的 Supabase 项目

## 环境变量

复制 `.env.example` 为 `.env.local`，填写：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# 仅服务端使用，禁止添加 NEXT_PUBLIC_ 前缀
WEREAD_API_KEY=

# 生产环境：允许调用扩展 API 的 chrome-extension:// 来源
EXTENSION_ALLOWED_ORIGINS=
```

`WEREAD_API_KEY` 从 [微信读书 Skill 官方页面](https://weread.qq.com/r/weread-skills) 获取。Key 绑定用户身份，不写入数据库、不进入客户端包、不写入日志。

安全隔离测试使用本地 .env.security.local（已加入 .gitignore）。从 .env.security.example 复制后填写 Account A/B，不要把这些测试账号加入 Netlify 生产环境。

## 本地启动

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。
## 用户名登录

登录与注册只接收用户名（字母、数字、下划线），系统会统一转小写并转换为：

```text
<username>@shiye.local
```

Supabase Auth 必须关闭 `Confirm email`，否则虚拟邮箱无法接收验证邮件，注册后不能自动登录。已有使用真实邮箱注册的账户不能通过用户名表单登录，需要单独迁移或在 Supabase 中手动确认并创建对应虚拟邮箱账户。

## 数据库迁移

按文件名顺序在 Supabase 执行：

1. `supabase/migrations/20261028_000000_create_tables.sql`
2. `supabase/migrations/20261028_000001_enable_rls_and_policies.sql`
3. `supabase/migrations/20261028_000002_add_private_files_content_hash.sql`
4. `supabase/migrations/20261028_000003_add_weread_import_metadata.sql`
5. `supabase/migrations/20261028_000004_add_extension_pairing.sql`

阶段 6 迁移新增微信读书来源字段；阶段 7 迁移新增扩展配对表、RLS、Token 校验 RPC，并调整来源去重索引以支持同一网页多次摘录。

## 微信读书导入

官方集成边界：

- Gateway：`https://i.weread.qq.com/api/agent/gateway`
- 官方 Skill 版本：`1.0.5`
- 请求：`POST application/json`，业务参数与 `api_name`、`skill_version` 平铺
- 鉴权：`Authorization: Bearer $WEREAD_API_KEY`

`/import` 提供两个明确入口：

- **文件导入**：PDF、TXT、Markdown，原有手动流程始终可用。
- **微信读书**：读取书架、搜索电子书、导入书籍/进度/划线/个人想法，并将阅读统计保存为私密笔记。

外部服务失败、Key 缺失/失效、限流、响应超时或协议升级时，界面显示真实错误，不伪造成功。个人想法同步单次最多读取 10 页（200 条），达到上限会明确提示。

## Chrome 网页摘录扩展

`browser-extension/` 提供 Manifest V3 扩展：

- 仅在用户点击后读取当前标签页选区。
- 展示选区并要求用户确认后提交。
- 不读取 Cookie、历史记录、登录凭证或未激活标签页。
- 配对码采用 32 字节随机值，数据库只保存 SHA-256 哈希。
- 服务端通过 `verify_and_create_clip` SECURITY DEFINER RPC 创建私密笔记，不使用 `SUPABASE_SERVICE_ROLE_KEY`。

加载步骤和完整测试流程见 `browser-extension/README.md`。生产环境需要把安装后的 `chrome-extension://...` 来源写入 `EXTENSION_ALLOWED_ORIGINS`。

## 检查命令

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:scan
npm run security:test
```

- `npm run test`：协议、映射和扩展 Token 单元测试。
- `npm run security:scan`：扫描客户端构建产物、扩展源码、公开环境变量和日志模式，确认真实服务端密钥未进入浏览器包。
- `npm run security:test`：使用 Account A/B 和匿名客户端执行真实 RLS、私有 Storage、笔记可见性与越权写入测试，并自动清理测试数据。
- 必须先运行生产构建，再运行安全扫描。

## Netlify 部署

项目使用根目录 `next.config.ts`，没有 `next.config.js`。Netlify 对 Next.js 项目会自动启用 OpenNext 适配器并安装/执行所需插件，不需要手动添加 Netlify Next.js 插件，也不需要提交 `netlify.toml`。

推荐 Netlify 设置：

- Node.js：`22`
- Build command：`npm run build`
- Publish directory：`.next`
- 先连接 Git 仓库并创建 Deploy Preview，完成冒烟测试后再发布生产。

### Netlify 环境变量

在 `Site configuration → Environment variables` 添加以下变量。每个变量都必须同时勾选 **Builds** 与 **Functions**，否则可能出现构建阶段能读取、函数运行时却缺失的情况：

| 变量 | Builds | Functions | 说明 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | 是 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 是 | 是 | Supabase publishable key |
| `WEREAD_API_KEY` | 是 | 是 | 微信读书官方 Key，仅服务端代码读取 |
| `EXTENSION_ALLOWED_ORIGINS` | 是 | 是 | 生产扩展来源，如 `chrome-extension://<extension-id>` |

生产环境不会默认信任任意 `chrome-extension://` 来源。必须把安装后的扩展 ID 写入 `EXTENSION_ALLOWED_ORIGINS`；多个来源用英文逗号分隔。不要把 `SECURITY_TEST_EMAIL_A/B` 或测试密码添加到生产环境。

### Supabase Auth 回调地址

在 Supabase Dashboard 的 `Authentication → URL Configuration` 中设置：

- Site URL：`https://<your-site>.netlify.app`
- Redirect URLs：
  - `https://<your-site>.netlify.app/**`
  - `https://deploy-preview-*--<your-site>.netlify.app/**`（需要测试 Deploy Preview 登录时）
  - `http://localhost:3000/**`（本地开发）

发布自定义域名后，把自定义域名加入 Site URL 和 Redirect URLs。不要使用过宽的第三方生产域名通配符。

### 扩展服务地址切换

1. 先在 Netlify 设置 `EXTENSION_ALLOWED_ORIGINS` 为实际安装后的扩展来源。
2. 打开扩展配对页面，把“拾页服务地址”改为 Netlify HTTPS 域名。
3. 首次提交时允许 Chrome/Edge 请求该 HTTPS 域名的访问权限。
4. 在拾页 `/settings` 重新生成配对码并粘贴到扩展。
5. 测试选区提交、私密笔记保存和撤权后的 401 拦截。

### Netlify 发布步骤

1. 确认 5 个 Supabase migration 已按顺序应用到生产 Supabase。
2. 在 Supabase 创建备份或确认 Point-in-Time Recovery 可用。
3. 将仓库连接到 Netlify，设置 Node 22 和环境变量。
4. 触发 Deploy Preview，检查构建日志、Functions 和 `/api/extension/imports`。
5. 在 Deploy Preview 完成登录、书架、导入、扩展配对和撤权冒烟测试。
6. 发布生产部署，更新 Supabase Site URL/Redirect URLs。
7. 更新扩展服务地址与生产扩展来源，重新配对。
8. 运行最终安全扫描和关键业务冒烟测试。

## 安全说明

- 所有用户数据表启用 RLS，私有文件使用私有 Storage bucket。
- 微信读书 Key 只在服务端读取，绝不回显给客户端。
- 公开笔记不会连带公开原始附件、导入任务或私有阅读记录。
- 未核验的外部 endpoint 和字段不得写入生产代码。
- 回滚策略见 `ROLLBACK.md`。

## 安全说明

- 所有用户数据表启用 RLS，私有文件使用私有 Storage bucket。
- 微信读书 Key 只在服务端读取，绝不回显给客户端。
- 公开笔记不会连带公开原始附件、导入任务或私有阅读记录。
- 未核验的外部 endpoint 和字段不得写入生产代码。
