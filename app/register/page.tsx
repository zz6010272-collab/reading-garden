"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { BookOpenText, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  AUTH_TIMEOUT_MESSAGE,
  AuthTimeoutError,
  withAuthTimeout,
} from "@/lib/auth/timeout";
import {
  normalizeUsername,
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

function readableSignUpError(message: string) {
  if (isNetworkError(message)) {
    return NETWORK_ERROR_MESSAGE;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("already registered")) {
    return "该用户名已被注册，请直接登录。";
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

    const normalizedUsername = normalizeUsername(username);
    const virtualEmail = usernameToVirtualEmail(normalizedUsername);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createBrowserClient();
      const { data, error } = await withAuthTimeout(
        supabase.auth.signUp({
          email: virtualEmail,
          password,
          options: {
            data: {
              username: normalizedUsername,
              display_name: normalizedUsername,
            },
          },
        }),
      );

      if (error) {
        setErrorMessage(readableSignUpError(error.message));
        return;
      }

      if (data.session) {
        // Full-page navigation intentionally resets the browser auth state after signup.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/library";
        return;
      }

      const { data: signInData, error: signInError } = await withAuthTimeout(
        supabase.auth.signInWithPassword({
          email: virtualEmail,
          password,
        }),
      );

      if (signInError || !signInData.session) {
        setErrorMessage(
          "注册成功，但无法自动登录。请确认用户名未被占用，并在 Supabase Auth 设置中关闭 Confirm email。",
        );
        return;
      }

      // Full-page navigation intentionally resets the browser auth state after signup.
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
            : message || "注册失败，请稍后重试。",
        );
      }
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
          注册只需要用户名和密码。用户名仅支持字母、数字和下划线，系统会自动转换为虚拟登录邮箱。
        </p>
        <p className="mt-12 border-t border-[#d4cebf] pt-5 text-xs leading-6 text-[#85877b]">
          注册即表示你同意仅上传自己有权处理的阅读资料，不公开整本版权内容。
        </p>
      </aside>
    </div>
  );
}
