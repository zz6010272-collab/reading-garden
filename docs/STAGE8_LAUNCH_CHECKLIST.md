# 阶段 8 上线检查清单

日期：2026-10-28  
部署目标：Netlify  
数据库与认证：Supabase

## 自动化结果

| 检查 | 状态 | 证据 |
| --- | --- | --- |
| TypeScript 严格类型检查 | 通过 | `node node_modules/typescript/bin/tsc --noEmit` |
| ESLint | 通过 | `node node_modules/eslint/bin/eslint.js .` |
| 单元/协议测试 | 通过 | `node --import jiti/register --test tests/*.test.ts` |
| Next.js 生产构建 | 通过 | `node node_modules/next/dist/bin/next build` |
| 扩展 manifest 与 popup 语法 | 通过 | `node --check browser-extension/popup.js` 与 JSON 解析 |
| 客户端密钥扫描 | 通过 | `node scripts/security-scan.mjs` |
| 服务端凭证日志模式扫描 | 通过 | `scripts/security-scan.mjs` |
| A/B/匿名 RLS 与 Storage 实库测试 | 待执行 | 需先在 `.env.security.local` 填写 Account A/B 登录凭证 |
| Netlify 实际部署 | 待执行 | 需要 Netlify 项目权限与生产域名 |
| Supabase Auth 生产回调验证 | 待执行 | 需要 Netlify 域名 |

## RLS 与 Storage 测试覆盖

`scripts/security-isolation.ts` 会创建唯一测试数据并在结束后清理：

- Account A 可读取自己的私有笔记。
- Account B 不可读取 A 的私有笔记。
- Account B 可读取 A 的 public/unlisted 笔记。
- Account B 不可读取 A 的书籍和阅读记录。
- Account B 不可读取 A 私有笔记引用。
- Account B 不可更新、删除或伪造写入 A 的数据。
- Account B 不可读取或下载 A 的私有文件。
- 匿名访客不可读取 private 笔记和私有文件。
- 匿名访客可读取 public/unlisted 笔记。
- 匿名访客不可写入笔记。
- 私有 Storage 公共 URL 不可直接访问。
- Account A 与 Account B 双向私有隔离。

## Netlify 上线前检查

- [ ] 5 个 Supabase migration 已按顺序应用到生产项目。
- [ ] Supabase 已创建备份或启用 Point-in-Time Recovery。
- [ ] Netlify 环境变量已配置 `NEXT_PUBLIC_SUPABASE_URL`。
- [ ] Netlify 环境变量已配置 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。
- [ ] Netlify 环境变量已配置 `WEREAD_API_KEY`。
- [ ] Netlify 环境变量已配置 `EXTENSION_ALLOWED_ORIGINS`。
- [ ] 每个 Netlify 环境变量同时勾选 Builds 与 Functions。
- [ ] Node.js 版本设置为 22。
- [ ] Build command 为 `npm run build`。
- [ ] Supabase Site URL 指向 Netlify 生产域名。
- [ ] Supabase Redirect URLs 包含 Netlify 域名与本地开发地址。
- [ ] 生产扩展 ID 已写入 `EXTENSION_ALLOWED_ORIGINS`。
- [ ] 扩展服务地址已切到 Netlify HTTPS 域名。
- [ ] 未把 Account A/B 测试凭证配置到 Netlify。
- [ ] 未把任何 Service Role Key 放入 `NEXT_PUBLIC_*`。

## 部署后冒烟检查

- [ ] 首页返回 200，未登录不渲染私有数据。
- [ ] 注册、登录、退出正常。
- [ ] `/library` 只展示当前用户书籍。
- [ ] private 笔记仅所有者可读。
- [ ] public 笔记出现在社区，unlisted 不出现在公共列表。
- [ ] PDF/TXT/Markdown 导入可执行，重复文件被拒绝。
- [ ] 微信读书书架、搜索、笔记和统计导入可用。
- [ ] 微信读书不可用时手动导入仍可用。
- [ ] 扩展配对、选区提交、私密笔记入库正常。
- [ ] 撤销扩展 Token 后提交返回 401。
- [ ] 私有 Storage 不能匿名访问。
- [ ] Netlify Function 日志和浏览器控制台无敏感凭证。
- [ ] 生产扩展来源与 Supabase 回调地址正确。

## 发布与回滚

- 部署顺序：Supabase 备份 → 数据库迁移 → Netlify Deploy Preview → 冒烟测试 → 生产发布 → Auth URL 更新 → 扩展重新配对。
- 应用回滚：Netlify Deploys 中发布上一个健康部署。
- 数据库回滚：优先保留增量迁移；仅数据损坏时按 `ROLLBACK.md` 使用 PITR/备份恢复。
- 扩展回滚：撤销 Token、清空 `EXTENSION_ALLOWED_ORIGINS` 或回退扩展版本。
- 微信读书回滚：移除/轮换 `WEREAD_API_KEY`，不影响手动导入。
