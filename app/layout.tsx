import type { Metadata } from "next";

import { NavBar } from "@/components/nav-bar";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "拾页 / Reading Garden",
    template: "%s · 拾页",
  },
  description: "个人阅读知识库与轻量读书社区。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col">
          <NavBar />
          <main className="flex-1">{children}</main>
          <footer className="mt-16 border-t border-[#e2dccf]">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-[#87897f] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <p>拾页 / Reading Garden · 把读过的页，放回生活里。</p>
              <p>当前版本使用演示数据，不连接真实数据库。</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}