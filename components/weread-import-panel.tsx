"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  BookOpenCheck,
  ChartNoAxesColumnIncreasing,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  importWereadBookAction,
  importWereadStatsAction,
  loadWereadShelfAction,
  searchWereadBooksAction,
} from "@/app/import/weread-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDuration } from "@/lib/importers/weread/mapper";
import type {
  WereadBookSummary,
  WereadImportResult,
  WereadReadingMode,
  WereadReadingStats,
  WereadShelf,
  WereadSearchResults,
} from "@/lib/importers/weread/types";

type WereadImportPanelProps = {
  configured: boolean;
};

const modeLabels: Record<WereadReadingMode, string> = {
  weekly: "本周",
  monthly: "本月",
  annually: "本年",
  overall: "全部时间",
};

function formatReadUpdateTime(value: number | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value * 1000);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function BookRows({
  books,
  busy,
  disabled,
  onImport,
}: {
  books: WereadBookSummary[];
  busy: string | null;
  disabled: boolean;
  onImport: (bookId: string) => void;
}) {
  if (books.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#ddd4c5] bg-[#faf7ef] px-4 py-5 text-sm text-[#7e8177]">
        没有可展示的电子书条目。
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {books.map((book) => {
        const importing = busy === `book:${book.bookId}`;
        const readTime = formatReadUpdateTime(book.readUpdateTime);

        return (
          <article
            key={book.bookId}
            className="flex min-h-44 flex-col rounded-xl border border-[#e3ddcf] bg-[#fffdf8] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-serif text-lg font-semibold leading-6 text-[#34382f]">
                  {book.title}
                </h3>
                <p className="mt-1 line-clamp-1 text-xs text-[#85877d]">
                  {book.author || "作者未提供"}
                </p>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 border-[#d9e0d2] bg-[#eff3eb] text-[#5c6e54]"
              >
                {book.finishReading ? "已读完" : book.secret ? "私密" : "书架"}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#85877d]">
              {book.category ? <span>{book.category}</span> : null}
              {readTime ? <span>最近阅读 {readTime}</span> : null}
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 pt-4">
              {book.sourceUrl ? (
                <a
                  href={book.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#68775e] underline-offset-4 hover:underline"
                >
                  微信读书
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-xs text-[#a0a197]">来源链接未提供</span>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={disabled || importing}
                onClick={() => onImport(book.bookId)}
              >
                {importing ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <BookOpenCheck data-icon="inline-start" />
                )}
                {importing ? "导入中" : "导入书籍与笔记"}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function WereadImportPanel({ configured }: WereadImportPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shelf, setShelf] = useState<WereadShelf | null>(null);
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] =
    useState<WereadSearchResults | null>(null);
  const [statsMode, setStatsMode] = useState<WereadReadingMode>("monthly");
  const [stats, setStats] = useState<WereadReadingStats | null>(null);
  const [statsNoteId, setStatsNoteId] = useState<string | null>(null);

  function run<T>(
    label: string,
    action: () => Promise<WereadImportResult<T>>,
    onSuccess?: (data: T) => void,
  ) {
    if (!configured) {
      setErrorMessage(
        "微信读书尚未配置，请由管理员设置服务端 WEREAD_API_KEY。",
      );
      return;
    }

    setBusy(label);
    setErrorMessage(null);
    setNotice(null);

    startTransition(async () => {
      try {
        const result = await action();

        if (!result.success || !result.data) {
          setErrorMessage(result.message);
          return;
        }

        setNotice(result.message);
        onSuccess?.(result.data);
      } catch {
        setErrorMessage("微信读书请求失败，请稍后重试。");
      } finally {
        setBusy(null);
      }
    });
  }

  function handleShelfLoad() {
    run("shelf", loadWereadShelfAction, setShelf);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run("search", () => searchWereadBooksAction(keyword), setSearchResults);
  }

  function handleBookImport(bookId: string) {
    run(`book:${bookId}`, () => importWereadBookAction(bookId), (data) => {
      router.push(`/notes/${data.noteId}`);
      router.refresh();
    });
  }

  function handleStatsImport() {
    run(`stats:${statsMode}`, () => importWereadStatsAction(statsMode), (data) => {
      setStats(data.stats);
      setStatsNoteId(data.noteId);
    });
  }

  return (
    <div className="space-y-6">
      {!configured ? (
        <Card className="gap-0 border border-[#e0d6c3] bg-[#f8f1e2] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eadcc4] text-[#755f3b]">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#3d392f]">
                微信读书尚未配置
              </h2>
              <p className="mt-2 text-sm leading-7 text-[#6f6759]">
                请从微信读书 Skill 官方页面获取 API Key，并在服务端环境变量中设置
                <code className="mx-1 rounded bg-[#eee3d0] px-1.5 py-0.5 text-xs">
                  WEREAD_API_KEY
                </code>
                。Key 不会发送到浏览器，也不会写入数据库。
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  className="rounded-full border-[#cdbb9d] bg-transparent"
                  nativeButton={false}
                  render={
                    <a
                      href="https://weread.qq.com/r/weread-skills"
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  获取官方 API Key
                  <ExternalLink data-icon="inline-end" />
                </Button>
                <span className="text-xs text-[#8a7a62]">
                  手动文件导入始终可用。
                </span>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-[#e3cfc8] bg-[#f8eeea] px-4 py-3 text-sm leading-6 text-[#8a574b]"
        >
          {errorMessage}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-[#d3ddcc] bg-[#eef2e9] px-4 py-3 text-sm leading-6 text-[#52664b]"
        >
          {notice}
        </p>
      ) : null}
      <Card className="gap-0 border border-[#e1dbcd] bg-[#fffdf8] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#ebe5d9] pb-5 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <BookOpenCheck className="size-5 text-[#68785e]" aria-hidden="true" />
              <h2 className="font-serif text-2xl font-semibold text-[#30342c]">
                书架同步
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#777a70]">
              读取当前微信读书账号的可见书架，并选择一本电子书导入书籍、阅读进度、划线与个人想法。专辑和文章收藏会计入官方书架总数，但当前不导入其内容。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={!configured || isPending}
            onClick={handleShelfLoad}
          >
            {busy === "shelf" ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            {busy === "shelf" ? "读取中" : "读取书架"}
          </Button>
        </div>

        {shelf ? (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-[#f5f1e7] px-4 py-3">
                <p className="text-xs text-[#85877d]">书架条目</p>
                <p className="mt-1 font-serif text-2xl text-[#3d4438]">{shelf.totalEntries}</p>
              </div>
              <div className="rounded-xl bg-[#f5f1e7] px-4 py-3">
                <p className="text-xs text-[#85877d]">电子书</p>
                <p className="mt-1 font-serif text-2xl text-[#3d4438]">{shelf.books.length}</p>
              </div>
              <div className="rounded-xl bg-[#f5f1e7] px-4 py-3">
                <p className="text-xs text-[#85877d]">专辑 / 有声书</p>
                <p className="mt-1 font-serif text-2xl text-[#3d4438]">{shelf.albumCount}</p>
              </div>
              <div className="rounded-xl bg-[#f5f1e7] px-4 py-3">
                <p className="text-xs text-[#85877d]">文章收藏</p>
                <p className="mt-1 font-serif text-2xl text-[#3d4438]">
                  {shelf.hasArticleCollection ? "1" : "0"}
                </p>
              </div>
            </div>
            <BookRows
              books={shelf.books}
              busy={busy}
              disabled={!configured || isPending}
              onImport={handleBookImport}
            />
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-[#ddd4c5] bg-[#faf7ef] px-4 py-5 text-sm leading-6 text-[#7e8177]">
            点击“读取书架”后会展示微信读书当前可见的电子书。导入操作会主动调用官方只读接口，不会在后台自动同步。
          </p>
        )}
      </Card>

      <Card className="gap-0 border border-[#e1dbcd] bg-[#fffdf8] p-5 sm:p-6">
        <div className="border-b border-[#ebe5d9] pb-5">
          <div className="flex items-center gap-2">
            <Search className="size-5 text-[#68785e]" aria-hidden="true" />
            <h2 className="font-serif text-2xl font-semibold text-[#30342c]">
              搜索并导入
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#777a70]">
            在微信读书电子书范围中搜索书名或关键词。搜索结果是分页片段，不代表全量书库；选择结果后会导入该书当前可读取的阅读记录与个人笔记。
          </p>
        </div>

        <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            maxLength={100}
            placeholder="例如：三体"
            className="h-10 flex-1 rounded-full border-[#d8d2c4] bg-[#fdfbf6]"
          />
          <Button
            type="submit"
            className="h-10 rounded-full bg-[#68785d] px-5 text-white hover:bg-[#5a6a50]"
            disabled={!configured || isPending || !keyword.trim()}
          >
            {busy === "search" ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : (
              <Search data-icon="inline-start" />
            )}
            {busy === "search" ? "搜索中" : "搜索"}
          </Button>
        </form>

        {searchResults ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-[#777a70]">
              为“{searchResults.keyword}”找到 {searchResults.books.length} 个电子书结果。
            </p>
            <BookRows
              books={searchResults.books}
              busy={busy}
              disabled={!configured || isPending}
              onImport={handleBookImport}
            />
          </div>
        ) : null}
      </Card>

      <Card className="gap-0 border border-[#e1dbcd] bg-[#fffdf8] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#ebe5d9] pb-5 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <ChartNoAxesColumnIncreasing
                className="size-5 text-[#68785e]"
                aria-hidden="true"
              />
              <h2 className="font-serif text-2xl font-semibold text-[#30342c]">
                阅读统计
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#777a70]">
              读取官方统计并保存为一篇私密 Markdown 笔记。重复导入同一周期会更新原笔记，不会生成重复记录。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={statsMode}
              onValueChange={(value) => {
                if (value) {
                  setStatsMode(value as WereadReadingMode);
                }
              }}
            >
              <SelectTrigger className="w-full border-[#d8d2c4] bg-[#fdfbf6] sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(modeLabels) as WereadReadingMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {modeLabels[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
              disabled={!configured || isPending}
              onClick={handleStatsImport}
            >
              {busy === `stats:${statsMode}` ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : (
                <ChartNoAxesColumnIncreasing data-icon="inline-start" />
              )}
              {busy === `stats:${statsMode}` ? "读取并保存中" : "导入统计笔记"}
            </Button>
          </div>
        </div>

        {stats ? (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#f5f1e7] px-4 py-3">
                <p className="text-xs text-[#85877d]">阅读时长</p>
                <p className="mt-1 font-serif text-xl text-[#3d4438]">
                  {formatDuration(stats.totalReadTimeSeconds)}
                </p>
              </div>
              <div className="rounded-xl bg-[#f5f1e7] px-4 py-3">
                <p className="text-xs text-[#85877d]">有效阅读天数</p>
                <p className="mt-1 font-serif text-xl text-[#3d4438]">
                  {stats.readDays} 天
                </p>
              </div>
              <div className="rounded-xl bg-[#f5f1e7] px-4 py-3">
                <p className="text-xs text-[#85877d]">自然日均</p>
                <p className="mt-1 font-serif text-xl text-[#3d4438]">
                  {stats.dayAverageReadTimeSeconds === null
                    ? "官方未返回"
                    : formatDuration(stats.dayAverageReadTimeSeconds)}
                </p>
              </div>
            </div>

            {stats.topBooks.length > 0 ? (
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#3b4037]">阅读排行</h3>
                <ol className="mt-3 space-y-2">
                  {stats.topBooks.map((book, index) => (
                    <li
                      key={`${book.title}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#ebe5d9] px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-[#555b50]">
                        {index + 1}. {book.title}
                        {book.author ? ` · ${book.author}` : ""}
                      </span>
                      <span className="shrink-0 text-xs text-[#85877d]">
                        {formatDuration(book.readTimeSeconds)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {statsNoteId ? (
              <Link
                href={`/notes/${statsNoteId}`}
                className="inline-flex items-center gap-1 text-sm text-[#52644a] underline-offset-4 hover:underline"
              >
                查看已保存的统计笔记
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
