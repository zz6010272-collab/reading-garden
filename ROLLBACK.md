# 拾页线上回滚策略

本文用于 Netlify + Supabase 生产环境。原则是**先止血、再回滚应用、最后才评估数据库恢复**。不要为了回滚代码而立即删除数据库列或用户数据。

## 1. 故障分级与立即止血

### 外部服务或凭证异常

- 微信读书异常：从 Netlify 删除或轮换 `WEREAD_API_KEY`，手动文件导入和核心读书流程仍可继续使用。
- 扩展 API 异常：把 `EXTENSION_ALLOWED_ORIGINS` 临时设为空，或在 Supabase 撤销全部扩展 Token。
- 疑似凭证泄漏：立即轮换微信读书 Key 和 Supabase publishable key；检查 Netlify/Supabase 日志，但不要复制或公开完整凭证。
- 疑似越权：暂停相关入口，保留日志与数据库快照，再执行权限修复；不要直接关闭 RLS。

### 数据损坏或错误写入

1. 暂停新写入或下线故障入口。
2. 导出受影响表或创建数据库快照。
3. 记录故障开始时间、受影响用户和最后一条正常数据时间。
4. 不要在生产库直接执行不可逆删除或大范围 `UPDATE`。

## 2. Netlify 应用回滚

1. 打开 Netlify 项目的 `Deploys`。
2. 找到上一个通过验收的部署。
3. 选择 `Rollback to this deploy` / 发布该历史部署。
4. 确认生产域名切换到旧版本。
5. 执行关键冒烟测试：
   - 首页返回 200。
   - 登录和退出正常。
   - `/library`、`/notes/[id]`、`/import`、`/settings` 可访问。
   - `/api/extension/imports` 的预期行为与旧版本一致。
6. 若故障与新的环境变量有关，同时恢复旧环境变量值并重新部署。

代码回滚优先于数据库回滚。当前数据库迁移均为向前兼容的增量迁移，旧版本应用通常可以继续使用保留的新列和新表。

## 3. 功能级降级

### 扩展摘录

- 在 Supabase 执行：

```sql
update public.extension_tokens
set revoked_at = coalesce(revoked_at, now());
```

- 将 Netlify `EXTENSION_ALLOWED_ORIGINS` 清空并重新部署。
- 扩展入口不可用时，手动笔记和文件导入仍应正常工作。

### 微信读书

- 移除 `WEREAD_API_KEY` 并重新部署。
- `/import` 的手动文件导入必须保持可用。
- 不要删除已导入的书籍、笔记或阅读记录；这些是用户数据。

### 公开内容异常

- 将有风险的笔记临时改为 `private`：

```sql
update public.notes
set visibility = 'private'
where id in ('<note-id-1>', '<note-id-2>');
```

- 先确认笔记确属异常范围，避免误伤正常公开内容。
- 不要通过关闭 notes 的 RLS 来“快速修复”。

## 4. Supabase 数据恢复

### 首选：Point-in-Time Recovery

Supabase 计划支持时，优先恢复到故障时间点之前：

1. 确认恢复点时间。
2. 创建当前数据库快照，保留故障现场。
3. 按 Supabase 控制台流程执行 PITR。
4. 恢复后重新应用最近确认安全的迁移。
5. 验证 Auth、RLS、Storage、扩展 RPC 和生产站点。

PITR 会丢失恢复点之后的所有写入。执行前必须通知受影响用户，并记录恢复窗口。

### 无 PITR：备份恢复到新项目

1. 将最近备份恢复到新的 Supabase 项目。
2. 在 Netlify 更新 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。
3. 重新配置 Auth Site URL、Redirect URLs 和 Storage 私有 bucket。
4. 完整验证后再切换生产域名。
5. 保留旧项目只读一段时间，确认无回切需求后再回收。

## 5. 迁移级别的紧急回滚

以下操作仅用于确认备份可用且业务必须回到旧结构的情况。常规应用回滚不应执行这些 SQL。

### 阶段 7 扩展配对迁移

```sql
revoke all on function public.verify_and_create_clip(text, text, text, text, text)
from anon, authenticated;

drop function if exists public.verify_and_create_clip(text, text, text, text, text);
drop trigger if exists extension_tokens_protect_fields on public.extension_tokens;
drop function if exists public.protect_extension_token_fields();
drop table if exists public.extension_tokens;
```

注意：删除 `extension_tokens` 会使用户配对全部失效；如果需要保留配对记录，只清空扩展入口并回滚应用，不要删表。

### 阶段 6 微信读书迁移

阶段 6 字段可以保留。删除 `books.book_identifier`、`books.source_type`、`books.source_url`、`notes.source_url` 或 `reading_records.progress_percent` 会丢失来源与进度数据，不建议作为应用回滚步骤。

### 阶段 5 文件哈希迁移

`private_files.content_hash` 可以保留。旧应用不会因新增列而失败；不要为了回滚代码删除文件指纹。

## 6. 扩展与外部来源回滚

- 扩展发布回滚：在 Chrome Web Store/Edge 扩展管理后台回退到上一版本，或临时下架。
- 已安装扩展的本地 Token 不会因站点回滚自动消失，因此必要时必须撤销数据库中的 Token。
- 微信读书 Key 轮换后，旧 Key 应立即失效。
- 生产扩展 ID 变更后，同步更新 `EXTENSION_ALLOWED_ORIGINS` 并重新配对。

## 7. 回滚后验证清单

- [ ] Netlify 生产部署已切回健康版本。
- [ ] 首页、登录、退出、书房、笔记、导入、设置均可用。
- [ ] 匿名用户无法读取 private 笔记或私有 Storage。
- [ ] Account A/B 互相隔离。
- [ ] 扩展 Token 撤销后提交返回 401。
- [ ] 微信读书 Key 缺失时手动导入仍可用。
- [ ] Supabase Auth Redirect URLs 指向当前生产域名。
- [ ] 没有在日志、客户端产物或公开仓库中暴露密钥。
- [ ] 恢复窗口、数据影响和后续修复责任人已记录。

## 8. 禁止事项

- 不通过关闭 RLS 修复权限问题。
- 不把 Service Role Key 放入 `NEXT_PUBLIC_*` 或客户端。
- 不在未备份时执行大范围删除、重建数据库或不可逆迁移。
- 不伪造部署成功、测试通过或数据恢复完成。
- 不在生产环境使用 Account A/B 的安全测试脚本创建持久测试数据。
