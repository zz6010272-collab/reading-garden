# 阶段 6 验收报告：微信读书官方 Agent Skill 导入

日期：2026-10-28

## 实现范围

- 服务端 Gateway 客户端：固定官方 endpoint、`skill_version`、Bearer 鉴权、超时与响应大小限制。
- 官方只读能力：书架、电子书搜索、书籍详情、阅读进度、个人划线、个人想法/点评、阅读统计。
- 统一规范化导入：书籍元数据、阅读状态/进度/评分、章节划线、想法正文、来源 URL 与稳定来源 ID。
- 幂等写入：同一微信读书书籍更新原记录；同一周期统计更新原私密笔记。
- `/import` 分流：文件导入与微信读书导入使用独立标签页，手动导入不依赖微信读书配置。
- 错误处理：Key 缺失/失效、限流、超时、网络失败、协议升级和响应结构异常均有稳定可读提示；失败写入 `import_jobs.status = failed`。
- 来源字段：`books.book_identifier/source_type/source_url`、`notes.source_url`、`reading_records.progress_percent`。

## 官方协议核验

- 官方页面：`https://weread.qq.com/r/weread-skills`
- 官方仓库：`https://github.com/Tencent/WeChatReading`
- 校验版本：Skill `1.0.5`
- Gateway：`https://i.weread.qq.com/api/agent/gateway`
- 请求：`POST application/json`，`api_name`、业务参数、`skill_version` 平铺
- 鉴权：`Authorization: Bearer $WEREAD_API_KEY`
- 使用接口：`/shelf/sync`、`/store/search`、`/book/info`、`/book/getprogress`、`/book/bookmarklist`、`/review/list/mine`、`/readdata/detail`

## 已执行检查

```text
node node_modules/typescript/bin/tsc --noEmit
结果：通过，0 个类型错误

node node_modules/eslint/bin/eslint.js .
结果：通过，0 个 error / 0 个 warning

node --import jiti/register --test tests/*.test.ts
结果：10 项测试通过，0 失败

node node_modules/next/dist/bin/next build
结果：Next.js 16.4.3 生产构建通过，14 个静态页面生成完成

curl -I http://127.0.0.1:3100/import
结果：未登录请求返回 307，Location: /login
```

测试覆盖：

- 书架总数包含电子书、专辑/有声书和文章收藏。
- 搜索跨分组结果去重。
- 官方字段映射、划线去重、章节关联、想法正文和评分/进度转换。
- 阅读统计时长按秒处理和 Markdown 输出。
- 成功、鉴权失败、限流、升级提示和非法响应协议。
- 未配置 Key 时不发请求；已配置时使用验证过的 Bearer 头、固定 endpoint、平铺参数和 `skill_version`。

## 未执行或阻塞项

- 真实微信读书账号联调已由项目开发者验证通过：数据拉取、入库、去重与阅读状态同步正常。
- 阶段 6 迁移已应用，真实导入数据已成功写入目标 Supabase 项目。
- **真实双用户 RLS 回归未执行**：沿用阶段 3 已有策略，本次未新增表；阶段 6 新增列仍由原 owner policy 覆盖。

## 已知限制

- 个人想法/点评使用官方游标分页；单次导入最多 10 页（200 条），超出会明确提示未完整同步。
- 官方未公开固定速率限制，因此不并发批量拉取，所有外部读取由用户主动触发。
- 微信读书书架中的专辑/有声书和文章收藏只计入官方书架总数，当前版本不导入其内容。
- 搜索结果只代表接口返回的分页片段，不声明全量书库结果。
