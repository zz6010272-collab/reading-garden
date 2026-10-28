"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, BookOpenText, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  AUTH_TIMEOUT_MESSAGE,
  AuthTimeoutError,
  withAuthTimeout,
} from "@/lib/auth/timeout";
import {
  usernameToVirtualEmail,
  validateUsername,
} from "@/lib/auth/username";

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

function readableSignInError(message: string) {
  if (isNetworkError(message)) {
    return NETWORK_ERROR_MESSAGE;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "用户名或密码不正确，请重新输入。";
  }

  if (normalized.includes("email not confirmed")) {
    return "当前 Supabase 项目启用了邮箱确认，用户名登录不可用。请在 Supabase Auth 设置中关闭 Confirm email。";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "尝试次数过多，请稍后再试。";
  }

  return `登录失败：${message}`;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const usernameError = validateUsername(username);

    if (usernameError) {
      setErrorMessage(usernameError);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createBrowserClient();
      const { error } = await withAuthTimeout(
        supabase.auth.signInWithPassword({
          email: usernameToVirtualEmail(username),
          password,
        }),
      );

      if (error) {
        setErrorMessage(readableSignInError(error.message));
        return;
      }

      // Full-page navigation intentionally resets the browser auth state after login.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/library";
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (error instanceof AuthTimeoutError) {
        setErrorMessage(AUTH_TIMEOUT_MESSAGE);
      } else {
        setErrorMessage(
          isNetworkError(message)
            ? NETWORK_ERROR_MESSAGE
            : message || "登录失败，请稍后重试。",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
      <aside className="hidden rounded-[2rem] border border-[#d9d2c3] bg-[#ece8dc] p-10 lg:block">
        <span className="flex size-12 items-center justify-center rounded-full border border-[#cbd1c3] bg-[#e2e8da] text-[#5f6f55]">
          <BookOpenText className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-10 font-serif text-4xl font-semibold leading-tight text-[#30352c]">
          回到你的书房，
          <br />
          接着读下一页。
        </h1>
        <p className="mt-5 max-w-sm text-sm leading-7 text-[#6e7267]">
          登录后可以继续整理书籍、摘录和感想，所有内容只属于你的账户。
        </p>
        <blockquote className="mt-12 border-l border-[#b8b1a1] pl-5 font-serif text-lg leading-8 text-[#5d6358]">
          “阅读不是为了离开生活，而是为了更清楚地回来。”
        </blockquote>
      </aside>

      <section className="mx-auto w-full max-w-md rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-6 sm:p-8">
        <p className="text-[10px] tracking-[0.22em] text-[#8b8d82]">
          WELCOME BACK
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-[#30342c]">
          登录拾页
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#777a70]">
          使用用户名和密码进入你的阅读空间。
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm text-[#545a4f]">用户名</span>
            <Input
              type="text"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入用户名（字母、数字、下划线）"
              className="h-10 border-[#d8d2c4] bg-[#fdfbf6]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-[#545a4f]">密码</span>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入密码"
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

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="h-10 w-full rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : null}
            {isSubmitting ? "登录中…" : "登录"}
            {!isSubmitting ? <ArrowRight data-icon="inline-end" /> : null}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#7b7e73]">
          还没有账户？
          <Link
            href="/register"
            className="ml-1 font-medium text-[#5c6d52] underline-offset-4 hover:underline"
          >
            注册拾页
          </Link>
        </p>
      </section>
    </div>
  );
}