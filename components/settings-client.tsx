"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Save, UserRound } from "lucide-react";

import { ExtensionPairingPanel } from "@/components/extension-pairing-panel";
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
import type { ExtensionTokenRecord } from "@/lib/extension/types";
import type { NoteVisibility } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";

type SettingsClientProps = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  initialTokens: ExtensionTokenRecord[];
};

export function SettingsClient({
  displayName,
  bio,
  avatarUrl,
  initialTokens,
}: SettingsClientProps) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<NoteVisibility>("private");
  const [dialogMode, setDialogMode] = useState<"save" | "logout" | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        return;
      }

      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
      setDialogMode(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="设置"
        description="管理账户入口、隐私偏好与浏览器扩展配对。"
        action={
          <span className="text-sm text-[#85877d]">{displayName} · 当前账户</span>
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
              <p className="mt-1 text-xs text-[#8a8c82]">
                资料保存不属于阶段 7 范围
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <label className="block space-y-2">
              <span className="text-sm text-[#5d6258]">显示名称</span>
              <Input
                defaultValue={displayName}
                placeholder="显示名称"
                className="border-[#d8d2c4] bg-[#fdfbf6]"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-[#5d6258]">个人简介</span>
              <Textarea
                defaultValue={bio}
                placeholder="介绍一下你的阅读偏好"
                className="min-h-28 border-[#d8d2c4] bg-[#fdfbf6]"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-[#5d6258]">头像 URL</span>
              <Input
                defaultValue={avatarUrl}
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
              新笔记的默认可见范围。当前选项仅为本阶段界面展示。
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
              已通过 Supabase 登录。退出后当前设备上的会话将失效。
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 rounded-full border-[#d9c9c3] text-[#825d53] hover:bg-[#f3e9e5]"
              disabled={isSigningOut}
              onClick={() => setDialogMode("logout")}
            >
              <LogOut data-icon="inline-start" />
              {isSigningOut ? "退出中…" : "退出登录"}
            </Button>
          </section>
        </div>
      </div>

      <div className="mt-6">
        <ExtensionPairingPanel initialTokens={initialTokens} />
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
              {dialogMode === "logout" ? "退出登录" : "个人资料尚未接入保存"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "logout"
                ? "确认退出当前账户吗？"
                : "阶段 7 只新增浏览器扩展配对能力，个人资料保存仍留在后续阶段处理。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {dialogMode === "logout" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setDialogMode(null)}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-[#825d53] text-white hover:bg-[#704c43]"
                  disabled={isSigningOut}
                  onClick={signOut}
                >
                  {isSigningOut ? "退出中…" : "确认退出"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
                onClick={() => setDialogMode(null)}
              >
                知道了
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
