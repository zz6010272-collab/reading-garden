# 拾页 / Reading Garden 架构设计

## 1. 架构原则

- 核心读书产品 + 导入适配器。书籍、阅读记录、笔记、搜索和权限是核心；微信读书、浏览器扩展等外部平台只是数据入口。
- 服务端组件优先，客户端组件只承担交互状态和浏览器能力。
- 鉴权与数据访问在服务端完成，数据库 RLS 是最终数据边界，不能由客户端隐藏按钮代替。
- 数据库结构、约束和 RLS 使用 `supabase/migrations/` 版本化演进。
- 外部依赖必须可替换、可禁用、可失败；任何外部平台异常都不得伪造成功结果。
- 默认最小暴露：默认私密、默认不公开附件、默认不持久化敏感凭证。

## 2. 高层数据流

```text
Browser / Chrome Extension
        |
        v
Next.js App Router (Server Components / Route Handlers / Server Actions)
        |
        +--> lib/validation  -> 统一输入校验
        +--> lib/importers   -> 外部来源适配器
        |
        v
Supabase Auth / Postgres + RLS / Private Storage
```

- 普通用户的读写请求使用用户会话与 publishable key，在 RLS 约束下执行。
- Service Role Key 仅限必要的服务端受控任务使用，不进入客户端、`NEXT_PUBLIC_*` 变量或日志。
- 私有文件通过服务端鉴权后签发短时有效 URL，或由服务端流式返回。

## 3. 数据模型

### 3.1 通用约定

- 主键默认使用 UUID。
- 时间字段统一使用带时区时间戳，至少包含 `created_at`、`updated_at`。
- 内容可见性统一为 `visibility = private | unlisted | public`；不支持 unlisted 的表必须明确限制允许值。
- `owner_id`/`user_id` 指向 `auth.users.id`，用于归属与 RLS 判断。
- `unlisted` 必须使用高熵 token，不得使用可枚举 ID；token 只在上传者主动分享时展示。
- 所有用户数据表启用 RLS，所有外键和常用筛选字段建立索引。

### 3.2 表与关键字段

| 表 | 归属字段 | 关键字段 | 可见性规则 | 关键约束 |
| --- | --- | --- | --- | --- |
| `profiles` | `id`，同时是 `auth.users.id` | `username`、`display_name`、`avatar_url`、`bio`、`visibility`、`created_at`、`updated_at` | `private` 仅本人；`public` 可展示允许字段。主页不连带公开书籍、笔记或阅读记录。 | `id` PK；`username` 唯一；`visibility in ('private','public')`。 |
| `books` | `owner_id` | `title`、`author`、`book_identifier`、`cover_url`、`description`、`visibility`、`created_at`、`updated_at` | 默认 `private`；`public` 仅公开书籍元数据，不公开附件和阅读记录。 | `(owner_id, book_identifier)` 对非空 `book_identifier` 建唯一索引，用于重复检测。 |
| `reading_records` | `owner_id` | `book_id`、`status`、`progress_percent`、`started_at`、`finished_at`、`visibility`、`created_at`、`updated_at` | V1 固定 `private`；只有所有者与服务端受控流程可访问。 | `(owner_id, book_id)` 唯一；`progress_percent` 限制在 0–100。 |
| `notes` | `owner_id` | `book_id`（可空）、`title`、`content`、`visibility`、`unlisted_token`、`source_type`、`source_id`、`created_at`、`updated_at` | `private` 仅所有者；`public` 可进入公开流；`unlisted` 凭 token 访问且不进公共列表。 | `unlisted_token` 全局唯一；`visibility` 限制三种值。 |
| `note_quotes` | `owner_id`，且所属 `note_id` 必须属于同一所有者 | `note_id`、`quote_text`、`chapter`、`page`、`position`、`created_at` | 继承父笔记可见性；父笔记不可见时引用不可读。 | 通过触发器或策略校验 `owner_id` 与父笔记所有者一致；对 `note_id, position` 建查询索引，不强制唯一。 |
| `tags` | `owner_id` | `name`、`normalized_name`、`created_at` | 标签属于个人空间；不单独公开，只有关联公开笔记时才随笔记展示。 | `(owner_id, normalized_name)` 唯一。 |
| `note_tags` | 无独立归属字段，继承 `note_id` 的所有者 | `note_id`、`tag_id`、`created_at` | 继承父笔记可见性。 | 主键或唯一约束 `(note_id, tag_id)`；标签所有者必须与笔记所有者一致。 |
| `comments` | `user_id` | `note_id`、`body`、`created_at`、`updated_at`、`deleted_at` | 继承父笔记可见性；`private` 笔记下不可由非所有者评论或读取；已软删除内容不展示。 | 主键 `id`；索引 `(note_id, created_at)`；用户只能编辑/软删除自己的评论。 |
| `likes` | `user_id` | `note_id`、`created_at` | 仅可点赞当前用户有权读取的公开笔记；公开页可展示聚合数量。 | 唯一约束/复合主键 `(note_id, user_id)`，防止重复点赞。 |
| `import_jobs` | `owner_id` | `source_type`、`source_id`、`source_url`、`status`、`error_code`、`error_message`、`imported_at`、`visibility`、`created_at`、`updated_at` | V1 固定 `private`；只有所有者与服务端导入流程可访问。 | 对非空 `(owner_id, source_type, source_id)` 建唯一索引，支持重复导入检测。 |
| `private_files` | `owner_id` | `bucket`、`object_path`、`book_id`/`note_id`、`mime_type`、`byte_size`、`checksum_sha256`、`visibility`、`created_at` | V1 固定 `private`；不因父内容公开而公开。 | `(bucket, object_path)` 唯一；只允许服务端受控流程生成访问凭证。 |

### 3.3 实体关系

- 用户 `profiles` 拥有多本 `books`、多条 `reading_records`、多篇 `notes`、多个 `tags` 和 `import_jobs`。
- `reading_records` 关联一本书，默认每个用户每本书只有一条当前记录。
- `notes` 可关联一本书，也可独立存在；`note_quotes` 从属于笔记。
- `tags` 与 `notes` 通过 `note_tags` 多对多关联。
- `comments` 和 `likes` 关联笔记；点赞不可重复。
- `private_files` 可关联书籍或笔记，但访问权限始终独立判定。

## 4. 权限原则

### 4.1 可见性语义

- **Private**：仅所有者、以及经过服务端鉴权的受控流程可访问。不得返回给访客，也不得被公开聚合查询统计出敏感细节。
- **Public**：访客可读允许展示的字段，包括公开笔记及公开书籍元数据；不连带暴露私有附件、阅读记录、导入任务或未公开的引用上下文。
- **Unlisted**：凭不可猜测链接访问，不进入公共列表、搜索索引、推荐流或站点地图；不是强保密机制，不替代 RLS 和服务器鉴权。
- 列表接口只能返回调用者有权读取的记录；不能先返回数据再由客户端隐藏。

### 4.2 RLS + Storage + 服务端鉴权

所有用户数据访问必须同时满足三层：

1. **Postgres RLS**：限制行级读取、插入、更新和删除；匿名、登录用户、所有者分别验证。
2. **Storage 私有桶**：bucket 不公开；对象路径与用户归属绑定；访问通过短时签名 URL 或服务端代理。
3. **服务端鉴权与输入校验**：确认会话、所有权、目标记录的可见性、请求参数和文件类型；不信任客户端传入的 `owner_id`、`visibility` 或 MIME 类型。

补充规则：

- 关闭 RLS 不是修复权限问题的手段。
- RLS 策略不得仅依据客户端可伪造的 metadata。
- 公开查询使用明确字段投影，避免 `select *` 泄漏内部字段。
- `note_quotes`、`note_tags`、`comments` 等从属数据通过父笔记的权限进行级联判断。
- 所有数据库迁移和 RLS 变更前先建立可回退的 Git 节点，并在迁移后执行越权测试。

## 5. 导入适配器统一格式

不同来源先转换为统一中间格式，再由核心书籍/笔记服务写入。导入器不得直接越过校验层写入数据库。

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `source_type` | 是 | `pdf`、`txt`、`markdown`、`weread`、`browser_extension` 等来源类型。 |
| `source_id` | 视来源而定 | 来源侧稳定标识；本地文件可使用内容哈希。 |
| `title` | 是 | 书籍或原始文档标题。 |
| `author` | 否 | 作者信息。 |
| `book_identifier` | 否 | ISBN、来源书籍 ID 或其他可核验标识。 |
| `quote_text` | 否 | 用户主动选择的摘录文本。 |
| `reflection` | 否 | 用户的感想或整理内容。 |
| `chapter` | 否 | 章节或位置名称。 |
| `source_url` | 否 | 可追溯的原始链接，仅保存经过校验的 URL。 |
| `imported_at` | 是 | 来源数据被导入的时间。 |

适配器接口应返回结构化结果与可读错误；失败时记录 `import_jobs.status = failed` 和错误码，不生成伪造的成功记录。

## 6. 微信读书集成边界

以下为已核验的集成边界：

- 官方通过 **Agent Skill + API Gateway** 调用，API Gateway 地址为 `https://i.weread.qq.com/api/agent/gateway`。
- 鉴权头为 `Authorization: Bearer $WEREAD_API_KEY`，Key 绑定用户身份。
- 支持书架、笔记划线、阅读统计、书籍搜索等只读能力。
- 速率限制、Key 有效期、可读取数据范围以官方当前说明为准，当前标注为 **待验证**。
- API Key 只在服务端使用，不持久化明文，不写入日志、客户端响应、错误信息或分析事件。
- 未核验的 endpoint、字段或返回结构不得写死；外部服务不可用时必须明确失败，不得伪造成功响应。

## 7. 浏览器扩展边界

- 使用 Chrome Manifest V3。
- 仅声明 `activeTab`、`scripting`、`storage` 权限。
- 用户必须在当前页面主动选择内容并确认剪裁；导入的是用户主动选择的片段，不抓取全文。
- 不读取 Cookie、浏览历史、登录凭证或未激活标签页内容。
- 配对 token 与用户会话分离，服务端验证扩展配对状态；token 不进入日志或公开构建产物。
- 扩展只负责采集与提交用户选择的内容，权限判断、数据校验和落库仍由服务端完成。

## 8. 服务端边界与错误处理

- 所有写操作使用统一校验结果，拒绝未知字段和不合法可见性值。
- 401/403/404 的使用不得泄漏资源是否存在；无权查看的私有资源优先返回 404。
- 外部服务错误转换为稳定的内部错误码与可读用户消息，同时保留服务端诊断信息。
- 不在通用错误页、客户端 toast 或日志中显示连接串、密钥、完整 SQL 或第三方响应原文。