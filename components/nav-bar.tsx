"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpenText, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/library", label: "书房" },
  { href: "/community", label: "社区" },
  { href: "/import", label: "导入" },
  { href: "/settings", label: "设置" },
];

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <span className="size-2 rounded-full bg-[#8a9a7c]" aria-hidden="true" />
          <span className="text-sm text-[#6d7167]">演示用户</span>
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
            <div className="mt-3 flex items-center gap-2 border-t border-[#e2dccf] px-3 pt-4 text-sm text-[#6d7167]">
              <span className="size-2 rounded-full bg-[#8a9a7c]" aria-hidden="true" />
              演示用户
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}