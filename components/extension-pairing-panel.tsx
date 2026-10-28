"use client";

import { useState, useTransition } from "react";
import {
  Ban,
  Check,
  Copy,
  KeyRound,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import {
  generateExtensionTokenAction,
  revokeExtensionTokenAction,
} from "@/app/settings/extension-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExtensionTokenRecord } from "@/lib/extension/types";

type ExtensionPairingPanelProps = {
  initialTokens: ExtensionTokenRecord[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

export function ExtensionPairingPanel({
  initialTokens,
}: ExtensionPairingPanelProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generateToken() {
    setBusy("generate");
    setErrorMessage(null);
    setNotice(null);
    setCopied(false);

    startTransition(async () => {
      try {
        const result = await generateExtensionTokenAction();

        if (!result.success || !result.token || !result.record) {
          setErrorMessage(result.message);
          return;
        }

        const record = result.record;
        setGeneratedToken(result.token);
        setTokens((current) => [record, ...current]);
        setNotice(result.message);
      } catch {
        setErrorMessage("生成配对码失败，请稍后重试。");
      } finally {
        setBusy(null);
      }
    });
  }

  function revokeToken(tokenId: string) {
    setBusy(tokenId);
    setErrorMessage(null);
    setNotice(null);

    startTransition(async () => {
      try {
        const result = await revokeExtensionTokenAction(tokenId);

        if (!result.success || !result.record) {
          setErrorMessage(result.message);
          return;
        }

        const record = result.record;
        setTokens((current) =>
          current.map((token) => (token.id === record.id ? record : token)),
        );
        setNotice(result.message);
      } catch {
        setErrorMessage("撤销配对码失败，请稍后重试。");
      } finally {
        setBusy(null);
      }
    });
  }

  async function copyToken() {
    if (!generatedToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedToken);
      setCopied(true);
    } catch {
      setErrorMessage("复制失败，请手动选中配对码复制。");
    }
  }

  return (
    <section className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e7ecdf] text-[#5b6c52]">
            <KeyRound className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#30342c]">
              浏览器扩展配对
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#7b7e73]">
              配对码只以哈希保存。生成后明文仅展示一次，请立即粘贴到 Chrome
              扩展中；撤销后扩展会立即失去提交权限。
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
          disabled={isPending}
          onClick={generateToken}
        >
          {busy === "generate" ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          {busy === "generate" ? "生成中…" : "生成配对码"}
        </Button>
      </div>

      {generatedToken ? (
        <div className="mt-5 rounded-xl border border-[#d9d2b9] bg-[#f8f1df] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#66583e]">
              新配对码 · 只显示这一次
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-[#cdbf9f] bg-transparent"
              onClick={copyToken}
            >
              {copied ? (
                <Check data-icon="inline-start" />
              ) : (
                <Copy data-icon="inline-start" />
              )}
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
          <Input
            readOnly
            value={generatedToken}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-3 border-[#cdbf9f] bg-[#fffdf8] font-mono text-xs"
            aria-label="扩展配对码"
          />
          <p className="mt-2 text-xs leading-5 text-[#8a7550]">
            离开或刷新页面后，这段明文将无法再次查看。
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-[#e3cfc8] bg-[#f8eeea] px-3 py-2 text-sm leading-6 text-[#8a574b]"
        >
          {errorMessage}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mt-5 rounded-lg border border-[#d2ddcb] bg-[#edf3e8] px-3 py-2 text-sm leading-6 text-[#52664b]"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-6 border-t border-[#ebe5d9] pt-5">
        <h3 className="text-sm font-medium text-[#4f554a]">配对记录</h3>
        {tokens.length > 0 ? (
          <div className="mt-3 space-y-2">
            {tokens.map((token) => {
              const revoked = Boolean(token.revoked_at);

              return (
                <div
                  key={token.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-[#ebe5d9] bg-[#faf7ef] px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-[#5d6258]">
                        {token.id.slice(0, 8)}…
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          revoked
                            ? "border-[#ddd4cc] bg-[#eee9e5] text-[#78655d]"
                            : "border-[#d3ddcc] bg-[#e8eee3] text-[#52664b]"
                        }
                      >
                        {revoked ? "已撤销" : "有效"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#8a8c82]">
                      创建于 {formatDate(token.created_at)}
                      {token.revoked_at
                        ? ` · 撤销于 ${formatDate(token.revoked_at)}`
                        : ""}
                    </p>
                  </div>
                  {!revoked ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full border-[#d9c9c3] text-[#825d53] hover:bg-[#f3e9e5]"
                      disabled={isPending}
                      onClick={() => revokeToken(token.id)}
                    >
                      {busy === token.id ? (
                        <LoaderCircle
                          className="animate-spin"
                          data-icon="inline-start"
                        />
                      ) : (
                        <Ban data-icon="inline-start" />
                      )}
                      {busy === token.id ? "撤销中…" : "撤销"}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-[#ddd4c5] bg-[#faf7ef] px-4 py-4 text-sm text-[#7e8177]">
            还没有配对记录。生成配对码后即可在 Chrome 扩展中使用。
          </p>
        )}
      </div>
    </section>
  );
}
