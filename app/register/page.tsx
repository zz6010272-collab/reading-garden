"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BookOpenText, LoaderCircle, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const NETWORK_ERROR_MESSAGE =
  "网络连接异常：请检查网络环境，或尝试开启代理/切换热点";

function isNetworkError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network error") ||
    normalized.includes("fetch failed") ||
    normalized.includes("aborterror") ||
    normalized.includes("aborted") ||
    normalized.includes("网络连接")
  );
}

function readableSignUpError(message: string) {
  if (isNetworkError(message)) {
    return NETWORK_ERROR_MESSAGE;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("already registered")) {
    return "该邮箱已注册，请直接登录。";
  }

  if (normalized.includes("password should be at least")) {
    return "密码至少需要 6 个字符。";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "尝试次数过多，请稍后再试。";
  }

  return `注册失败：${message}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(readableSignUpError(error.message));
        return;
      }

      if (data.session) {
        router.replace("/library");
        router.refresh();
        return;
      }

      setSuccessMessage(
        "注册成功。请查收邮箱并完成验证，然后返回这里登录。",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setErrorMessage(
        isNetworkError(message)
          ? NETWORK_ERROR_MESSAGE
          : message || "注册失败，请稍后重试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
      <section className="mx-auto order-2 w-full max-w-md rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-6 sm:p-8 lg:order-1">
        <p className="text-[10px] tracking-[0.22em] text-[#8b8d82]">
          START A GARDEN
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-[#30342c]">
          注册拾页
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#777a70]">
          创建一个账户，开始保存自己的阅读记录。
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm text-[#545a4f]">邮箱</span>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-10 border-[#d8d2c4] bg-[#fdfbf6]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-[#545a4f]">密码</span>
            <Input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 6 个字符"
              className="h-10 border-[#d8d2c4] bg-[#fdfbf6]"
            />
          </label>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-[#e3cfc8] bg-[#f8eeea] px-3 py-2 text-sm leading-6 text-[#8a574b]"
            >
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <div
              role="status"
              className="flex gap-2 rounded-lg border border-[#d2ddcb] bg-[#edf3e8] px-3 py-2 text-sm leading-6 text-[#52664b]"
            >
              <MailCheck className="mt-1 size-4 shrink-0" aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="h-10 w-full rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : null}
            {isSubmitting ? "注册中…" : "创建账户"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#7b7e73]">
          已经有账户？
          <Link
            href="/login"
            className="ml-1 font-medium text-[#5c6d52] underline-offset-4 hover:underline"
          >
            返回登录
          </Link>
        </p>
      </section>

      <aside className="order-1 hidden rounded-[2rem] border border-[#d9d2c3] bg-[#ece8dc] p-10 lg:order-2 lg:block">
        <span className="flex size-12 items-center justify-center rounded-full border border-[#cbd1c3] bg-[#e2e8da] text-[#5f6f55]">
          <BookOpenText className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-10 font-serif text-4xl font-semibold leading-tight text-[#30352c]">
          从第一本书开始，
          <br />
          慢慢长出你的花园。
        </h2>
        <p className="mt-5 max-w-sm text-sm leading-7 text-[#6e7267]">
          注册只需要邮箱和密码。完成验证后即可登录；书架和笔记的真实数据能力会在后续阶段接入。
        </p>
        <p className="mt-12 border-t border-[#d4cebf] pt-5 text-xs leading-6 text-[#85877b]">
          注册即表示你同意仅上传自己有权处理的阅读资料，不公开整本版权内容。
        </p>
      </aside>
    </div>
  );
}