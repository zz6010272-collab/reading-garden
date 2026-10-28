# 拾页 / Reading Garden

个人阅读知识库 + 轻量读书社区。当前已完成阶段 0–5，并实现阶段 6 的微信读书官方 Agent Skill 导入，等待真实账号联调验收。

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
```

`WEREAD_API_KEY` 从 [微信读书 Skill 官方页面](https://weread.qq.com/r/weread-skills) 获取。Key 绑定用户身份，不写入数据库、不进入客户端包、不写入日志。

## 本地启动

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 数据库迁移

按文件名顺序在 Supabase 执行：

1. `supabase/migrations/20261028_000000_create_tables.sql`
2. `supabase/migrations/20261028_000001_enable_rls_and_policies.sql`
3. `supabase/migrations/20261028_000002_add_private_files_content_hash.sql`
4. `supabase/migrations/20261028_000003_add_weread_import_metadata.sql`

阶段 6 迁移新增书籍来源标识、笔记来源 URL、导入去重索引和阅读进度字段；原有 RLS 策略继续生效。

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

## 检查命令

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

测试使用 Node 内置 test runner 与 `jiti` 加载 TypeScript，不依赖微信读书真实 Key。

## 安全说明

- 所有用户数据表启用 RLS，私有文件使用私有 Storage bucket。
- 微信读书 Key 只在服务端读取，绝不回显给客户端。
- 公开笔记不会连带公开原始附件、导入任务或私有阅读记录。
- 未核验的外部 endpoint 和字段不得写入生产代码。
