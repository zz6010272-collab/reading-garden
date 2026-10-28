"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BookOpenText, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/library", label: "书房" },
  { href: "/community", label: "社区" },
  { href: "/import", label: "导入" },
  { href: "/settings", label: "设置" },
];

export function NavBar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          setUser(null);
          return;
        }

        setUser(data.user);
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsAuthLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    setAuthError(null);
    setIsSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setAuthError(`退出登录失败：${error.message}`);
        return;
      }

      setUser(null);
      setMobileOpen(false);
      router.replace("/");
      router.refresh();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "退出登录失败，请稍后重试。",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  const emailPrefix = user?.email?.split("@")[0] ?? "已登录用户";

  return (
    <header className="sticky top-0 z-40 border-b border-[#ded8ca]/90 bg-[#faf8f3]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#7b8b70]"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex size-9 items-center justify-center rounded-full border border-[#cbd1c3] bg-[#e7ebdf] text-[#5f6f55]">
            <BookOpenText className="size-4" aria-hidden="true" />
          </span>
          <span className="leading-none">
            <span className="block font-serif text-2xl font-semibold tracking-[0.08em] text-[#30342c]">
              拾页
            </span>
            <span className="mt-1 block text-[9px] tracking-[0.24em] text-[#8b8d81]">
              READING GARDEN
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm text-[#65695f] outline-none transition-colors hover:bg-[#eee9dd] hover:text-[#30352c] focus-visible:ring-2 focus-visible:ring-[#7b8b70]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthLoading ? (
            <span className="text-xs text-[#8a8c82]">读取登录状态…</span>
          ) : user ? (
            <>
              <span
                className="size-2 rounded-full bg-[#8a9a7c]"
                aria-hidden="true"
              />
              <span className="max-w-32 truncate text-sm text-[#6d7167]">
                {emailPrefix}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSigningOut}
                className="rounded-full text-[#825d53] hover:bg-[#f3e9e5]"
                onClick={handleSignOut}
              >
                {isSigningOut ? "退出中…" : "退出登录"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-[#5e6659] hover:bg-[#eee9dd]"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                登录
              </Button>
              <Button
                size="sm"
                className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
                nativeButton={false}
                render={<Link href="/register" />}
              >
                注册
              </Button>
            </>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-[#4e544a] md:hidden"
          aria-label={mobileOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {mobileOpen ? (
        <div
          id="mobile-navigation"
          className="border-t border-[#e2dccf] bg-[#faf8f3] px-4 py-4 md:hidden"
        >
          <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="移动导航">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm text-[#65695f] outline-none hover:bg-[#eee9dd] focus-visible:ring-2 focus-visible:ring-[#7b8b70]"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-3 border-t border-[#e2dccf] px-3 pt-4">
              {isAuthLoading ? (
                <p className="text-sm text-[#85877d]">读取登录状态…</p>
              ) : user ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-[#5f6659]">
                    <span
                      className="size-2 rounded-full bg-[#8a9a7c]"
                      aria-hidden="true"
                    />
                    {emailPrefix}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSigningOut}
                    className="w-full rounded-full border-[#d9c9c3] text-[#825d53] hover:bg-[#f3e9e5]"
                    onClick={handleSignOut}
                  >
                    {isSigningOut ? "退出中…" : "退出登录"}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    nativeButton={false}
                    render={
                      <Link href="/login" onClick={() => setMobileOpen(false)} />
                    }
                  >
                    登录
                  </Button>
                  <Button
                    className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
                    nativeButton={false}
                    render={
                      <Link
                        href="/register"
                        onClick={() => setMobileOpen(false)}
                      />
                    }
                  >
                    注册
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      ) : null}

      {authError ? (
        <div className="border-t border-[#e3cfc8] bg-[#f8eeea] px-4 py-2">
          <p
            role="alert"
            className="mx-auto max-w-7xl text-xs text-[#8a574b]"
          >
            {authError}
          </p>
        </div>
      ) : null}
    </header>
  );
}