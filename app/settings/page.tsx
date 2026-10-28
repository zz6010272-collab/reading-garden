"use client";

import { useState } from "react";
import { LogOut, Save, UserRound } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { currentDemoProfile, type NoteVisibility } from "@/lib/mock-data";

type DialogMode = "save" | "logout" | null;

export default function SettingsPage() {
  const [visibility, setVisibility] = useState<NoteVisibility>("private");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="设置"
        description="管理公开资料、默认隐私选项与账户入口。当前表单不会保存或提交。"
        action={
          <span className="text-sm text-[#85877d]">
            {currentDemoProfile.display_name} · 演示用户
          </span>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <form
          className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-5 sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            setDialogMode("save");
          }}
        >
          <div className="flex items-center gap-3 border-b border-[#ebe5d9] pb-5">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#e7ecdf] text-[#5b6c52]">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#30342c]">
                个人资料
              </h2>
              <p className="mt-1 text-xs text-[#8a8c82]">表单占位 · 演示数据</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <label className="block space-y-2">
              <span className="text-sm text-[#5d6258]">显示名称</span>
              <Input
                defaultValue={currentDemoProfile.display_name}
                placeholder="显示名称"
                className="border-[#d8d2c4] bg-[#fdfbf6]"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-[#5d6258]">个人简介</span>
              <Textarea
                defaultValue={currentDemoProfile.bio}
                placeholder="介绍一下你的阅读偏好"
                className="min-h-28 border-[#d8d2c4] bg-[#fdfbf6]"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-[#5d6258]">头像 URL</span>
              <Input
                defaultValue={currentDemoProfile.avatar_url ?? ""}
                placeholder="https://..."
                className="border-[#d8d2c4] bg-[#fdfbf6]"
              />
            </label>
          </div>

          <div className="mt-7 flex justify-end border-t border-[#ebe5d9] pt-5">
            <Button
              type="submit"
              className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
            >
              <Save data-icon="inline-start" />
              保存设置
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-5 sm:p-7">
            <h2 className="font-serif text-xl font-semibold text-[#30342c]">
              隐私设置
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7b7e73]">
              新笔记的默认可见范围。创建后仍可逐篇调整。
            </p>
            <div className="mt-5 space-y-2">
              <span className="text-xs text-[#7c7f74]">默认可见范围</span>
              <Select
                value={visibility}
                onValueChange={(value) => {
                  if (value) {
                    setVisibility(value as NoteVisibility);
                  }
                }}
              >
                <SelectTrigger className="w-full border-[#d8d2c4] bg-[#fdfbf6]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">私密 · 仅自己</SelectItem>
                  <SelectItem value="unlisted">仅链接 · 不进入列表</SelectItem>
                  <SelectItem value="public">公开 · 可被访客看到</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-5 sm:p-7">
            <h2 className="font-serif text-xl font-semibold text-[#30342c]">
              账户
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7b7e73]">
              当前处于演示登录状态，没有真实会话。
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 rounded-full border-[#d9c9c3] text-[#825d53] hover:bg-[#f3e9e5]"
              onClick={() => setDialogMode("logout")}
            >
              <LogOut data-icon="inline-start" />
              退出登录
            </Button>
          </section>
        </div>
      </div>

      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null);
          }
        }}
      >
        <DialogContent className="border border-[#ded8ca] bg-[#fffdf8]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#30342c]">
              {dialogMode === "logout" ? "退出登录占位" : "设置保存占位"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "logout"
                ? "真实会话将在阶段 3 接入。当前演示环境不会修改登录状态。"
                : "真实设置保存将在阶段 3 接入。当前表单不会写入数据库。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
              onClick={() => setDialogMode(null)}
            >
              知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}