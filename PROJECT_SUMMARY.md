# 拾页 / Reading Garden — 项目总结

> 最后更新：2026-10-28  
> 项目状态：已上线，进入维护与迭代阶段  
> 生产平台：Netlify  
> 数据库与认证：Supabase

## 1. 项目定位

拾页是一个个人阅读知识库与轻量读书社区，核心能力包括：

- 管理个人书籍、阅读状态、阅读进度和个人评分。
- 记录 Markdown 笔记、摘录、引用、标签和个人感想。
- 支持 `private`、`public`、`unlisted` 三种可见范围。
- 导入 PDF、TXT、Markdown 文件。
- 通过微信读书官方 Agent Skill 导入书架、笔记、划线和阅读统计。
- 通过浏览器扩展主动剪贴网页选区为私密笔记。
- 提供公开笔记流、个人主页、评论和点赞入口。

## 2. 上线信息

| 项目 | 信息 |
| --- | --- |
| 生产平台 | Netlify |
| 部署状态 | 已上线 |
| Netlify 站点域名 | 仓库未记录，具体地址以 Netlify Site overview 为准 |
| 源码仓库 | https://github.com/zz6010272-collab/reading-garden.git |
| 主分支 | `main` |
| 认证方式 | 纯用户名 + 虚拟邮箱 |
| 虚拟邮箱格式 | `<username>@shiye.local` |
| 数据库 | Supabase Postgres |
| 文件存储 | Supabase Storage 私有 bucket `private_files` |

Netlify 会自动识别 Next.js，并使用 OpenNext 适配器完成构建和 Functions 部署，不需要手动安装 Netlify Next.js 插件。

## 3. 技术栈

- Next.js `16.4.3`，App Router。
- React `19.3.0`，默认服务端组件优先。
- TypeScript strict。
- Tailwind CSS 4 + shadcn/ui + Base UI。
- Supabase Auth、Postgres、RLS、Storage。
- `pdfjs-dist` 用于浏览器端 PDF 文字提取。
- `react-markdown` + `remark-gfm` 用于笔记渲染。
- Zod 用于服务端输入校验。
- Node.js test runner + `jiti` 用于自动化测试。

## 4. 目录结构

```text
app/                    页面、Route Handlers、Server Actions
components/             UI 与业务组件
components/ui/          shadcn/ui 基础组件
lib/auth/               用户名到虚拟邮箱的认证规则
lib/importers/          导入适配器与统一导入格式
lib/supabase/           Supabase 浏览器/服务端/匿名客户端
browser-extension/      Chrome/Edge Manifest V3 扩展
supabase/migrations/    数据库结构、RLS、Storage、RPC
scripts/                安全隔离测试与密钥扫描
tests/                  协议、映射、Token、认证规则测试
docs/                   PRD、架构、路线图、验收与上线清单
```

## 5. 高层架构

```text
Browser / Chrome Extension
          |
          v
Next.js App Router
  ├─ Server Components
  ├─ Server Actions
  ├─ Route Handlers
  ├─ lib/validation + Zod
  ├─ lib/importers
  └─ Supabase SSR / anon client
          |
          v
Supabase
  ├─ Auth
  ├─ Postgres + RLS
  ├─ Private Storage
  └─ SECURITY DEFINER RPC
```

服务端负责身份、权限、输入校验、敏感配置和数据库访问。客户端只负责交互与最小必要数据展示。

## 6. 认证架构

注册和登录只接收用户名，用户名必须满足：

- 字母、数字、下划线。
- 不超过 32 个字符。
- 不包含 `@` 或空格。
- 系统统一转小写后拼接为 `<username>@shiye.local`。

注册时写入用户元数据：

```json
{
  "username": "zhangsan",
  "display_name": "zhangsan"
}
```

Supabase Auth 需要启用自动确认邮箱的触发器或关闭 `Confirm email`，因为 `@shiye.local` 不会接收真实邮件。已有真实邮箱账户不能直接通过用户名表单登录。

## 7. 核心数据与权限

主要表：

- `profiles`
- `books`
- `reading_records`
- `notes`
- `note_quotes`
- `tags`
- `note_tags`
- `comments`
- `likes`
- `import_jobs`
- `private_files`
- `extension_tokens`

所有用户数据表启用 RLS。

可见性规则：

- `private`：仅所有者。
- `public`：允许访客读取明确公开的内容。
- `unlisted`：通过不可猜测链接访问，不进入公共列表。

私有 Storage bucket 不公开，文件元数据和对象路径按用户归属隔离。公开笔记不会连带公开原始文件、阅读记录或导入任务。

## 8. 导入架构

### 文件导入

- PDF、TXT、Markdown。
- 服务端校验扩展名、MIME、大小和内容。
- SHA-256 内容哈希去重。
- 文件进入私有 Storage，可生成私密笔记。
- 手动导入不依赖微信读书或扩展。

### 微信读书

- 官方 Agent Skill 版本：`1.0.5`。
- Gateway：`https://i.weread.qq.com/api/agent/gateway`。
- 鉴权：`Authorization: Bearer $WEREAD_API_KEY`。
- 业务参数与 `api_name`、`skill_version` 平铺。
- 支持 `/shelf/sync`、`/store/search`、`/book/info`、`/book/getprogress`、`/book/bookmarklist`、`/review/list/mine`、`/readdata/detail`。
- Key 仅在服务端读取，不持久化明文，不进入客户端构建产物或日志。

### 浏览器扩展

- Manifest V3。
- 基础权限：`activeTab`、`scripting`、`storage`。
- 本地应用域名使用 `host_permissions`；生产 HTTPS 域名使用按需授权。
- 只在用户点击后读取当前标签页选区。
- 用户预览并确认后提交。
- 配对 Token 为 32 字节随机值，数据库仅保存 SHA-256 哈希。
- Token 可查看、撤销，撤销后请求返回 401。
- 通过 `verify_and_create_clip` SECURITY DEFINER RPC 创建私密笔记，不使用 Service Role Key。

## 9. 安全措施

- 所有用户数据表启用 RLS。
- 私有 Storage bucket 禁止匿名访问。
- 微信读书 Key 与扩展 Token 不进入 `NEXT_PUBLIC_*`。
- 扩展 Token 只保存哈希，可撤销且不可重新启用。
- API 校验 Bearer Token、CORS 来源、JSON、URL、标题和内容长度。
- RPC 使用固定空 `search_path`。
- 安全扫描覆盖客户端产物、扩展源码、公开环境变量和敏感日志模式。
- 回滚策略见 `ROLLBACK.md`。

## 10. 数据库迁移

按顺序执行：

1. `20261028_000000_create_tables.sql`
2. `20261028_000001_enable_rls_and_policies.sql`
3. `20261028_000002_add_private_files_content_hash.sql`
4. `20261028_000003_add_weread_import_metadata.sql`
5. `20261028_000004_add_extension_pairing.sql`

迁移均为增量结构，应用代码回滚时通常应保留新增列和表，避免丢失用户数据。

## 11. 环境变量

本地使用 `.env.local`，Netlify 使用 Site configuration → Environment variables。

| 变量 | 作用 | Netlify Scopes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Builds + Functions |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | Builds + Functions |
| `WEREAD_API_KEY` | 微信读书服务端 Key | Builds + Functions |
| `EXTENSION_ALLOWED_ORIGINS` | 生产扩展来源 | Builds + Functions |

`.env.local`、`.env.security.local` 均被 Git 忽略，不应提交。

## 12. 检查命令

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:scan
```

安全隔离脚本：

```bash
npm run security:test
```

该脚本使用本地 `.env.security.local` 中的 Account A/B，执行 RLS、私有 Storage、匿名访问与跨用户隔离测试，并自动清理测试数据。真实账号 RLS 手动测试已由项目所有者决定跳过。

## 13. 已知限制

- 已有真实邮箱账户不能通过新的纯用户名表单登录。
- 虚拟邮箱依赖 Supabase 自动确认机制。
- 微信读书单次最多读取 10 页个人想法/点评，超出会提示未完整同步。
- 微信读书书架的专辑/有声书和文章收藏不导入内容。
- 扩展搜索/书架能力依赖外部服务可用性。
- 当前 Netlify 具体站点域名未写入仓库。
- 个人资料保存和默认可见性设置仍是后续迭代项。

## 14. 回滚与运维

- 应用回滚：Netlify Deploys 发布上一个健康部署。
- 数据库回滚：优先保留增量迁移；数据损坏时使用 Supabase PITR 或备份恢复。
- 扩展异常：撤销全部 Token 或清空 `EXTENSION_ALLOWED_ORIGINS`。
- 微信读书异常：移除或轮换 `WEREAD_API_KEY`，手动导入继续可用。
- 完整策略见 `ROLLBACK.md`，上线检查见 `docs/STAGE8_LAUNCH_CHECKLIST.md`。
