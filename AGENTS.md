<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 拾页 / Reading Garden

个人阅读知识库 + 轻量读书社区。

本文件是后续开发阶段的工程约束。产品范围以 `docs/PRD.md` 为准，系统设计以 `docs/ARCHITECTURE.md` 为准，阶段边界以 `docs/ROADMAP.md` 为准；发现冲突时先修正文档，再开始编码。

## 技术栈

以当前 `package.json`、`components.json` 和已安装版本为准：

- Next.js `16.4.3`，App Router，默认服务端组件优先。
- React `19.3.0`。
- TypeScript `^5`，`tsconfig.json` 已启用 `strict: true`。
- Tailwind CSS `^4`，使用 CSS variables。
- shadcn/ui CLI `4.23.0`，当前配置为 `base-nova`、neutral、Lucide 图标；组件底层涉及 `@base-ui/react`。
- Supabase Auth / Postgres / Storage：规划接入，当前仅有环境变量占位，尚未安装或连接 Supabase SDK。

## 目录约定

- `app/`：页面与路由。优先使用服务端组件；只有需要浏览器状态、事件或第三方客户端能力时才使用 Client Component。
- `components/`：可复用业务组件。`components/ui/` 专用于 shadcn/ui 组件，不在此目录堆放业务逻辑。
- `lib/supabase/`：浏览器端与服务端的 Supabase 客户端封装、会话和鉴权辅助逻辑。
- `lib/importers/`：导入适配器，采用统一接口，再按 PDF、TXT、Markdown、微信读书等来源分别实现。
- `lib/validation/`：请求、表单、文件与导入数据的校验逻辑。
- `supabase/migrations/`：按时间顺序、可版本化执行的 SQL 迁移与 RLS 策略。
- `browser-extension/`：Chrome 扩展，Manifest V3。
- `docs/`：产品、架构、路线图与阶段验收文档。

## 编码约定

- TypeScript 严格模式；不要用 `any`、非空断言或关闭检查来绕过类型问题。
- Next.js 16 中 `params` 和 `searchParams` 是 Promise，页面、布局及元数据相关代码中必须 `await` 后再读取。
- 清晰划清服务端与客户端边界：服务端负责鉴权、数据访问、敏感配置和权限判断；客户端只负责交互与最小必要展示数据。
- 错误处理必须返回用户可读、可定位的信息，并保留服务端诊断上下文；不得吞异常、伪造成功或把敏感错误原样暴露给客户端。
- 服务端输入一律校验；数据库约束、RLS 和应用层校验应相互补充，不得只依赖其中一层。
- 优先复用现有 shadcn/ui 基础组件，避免自行复制一套视觉组件。

## 安全规则

以下规则为后续所有阶段的硬性要求：

- 所有用户数据表启用 RLS，不得以关闭 RLS 的方式修复权限报错。
- Supabase Storage 使用私有 bucket，私有文件不可匿名访问。
- Service Role Key 绝不进入 `NEXT_PUBLIC_*` 变量、客户端打包产物或日志。
- 不得硬编码凭证、默认管理员账号或第三方 API Key。
- 外部接口（微信读书、浏览器扩展配对）未核验前不得写死 endpoint 或伪造成功响应。
- 微信读书 API Key 只在服务端使用，不持久化明文。

## 测试要求

- 每个阶段结束必须报告实际执行的命令和真实结果。
- 未运行的检查必须说明原因；不得用“已完成”替代真实测试。
- 至少覆盖相关功能的正向路径、未登录/越权路径、错误路径和边界输入。
- 数据库与文件权限变更必须包含匿名、普通用户、所有者三类访问验证。
- 若测试受外部服务、凭证或网络限制阻塞，必须明确列出阻塞项，不得伪造通过结果。

## 阶段推进规则

- 一次只做一个阶段。
- 结构性错误先修当前阶段，不跳阶段，不用后续功能掩盖当前缺陷。
- 数据库迁移和 RLS 变更前先建立可回退的 Git 节点。
- 开始下一阶段前，必须满足 `docs/ROADMAP.md` 中当前阶段的验收门槛，并等待用户确认。