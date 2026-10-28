import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { LoadingState } from "@/components/loading-state";
import { SettingsClient } from "@/components/settings-client";
import type { ExtensionTokenRecord } from "@/lib/extension/types";
import { createClient } from "@/lib/supabase/server";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <LoadingState cards={2} label="正在加载账户设置…" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: tokenRows, error: tokenError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("extension_tokens")
        .select("id, created_at, revoked_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (tokenError) {
    console.error("[extension] failed to load pairing records", {
      databaseCode: tokenError.code,
    });
    throw new Error("加载扩展配对记录失败，请确认阶段 7 迁移已执行。");
  }

  const displayName =
    profile?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "新读者";

  return (
    <SettingsClient
      displayName={displayName}
      bio={profile?.bio ?? ""}
      avatarUrl={profile?.avatar_url ?? ""}
      initialTokens={(tokenRows ?? []) as ExtensionTokenRecord[]}
    />
  );
}
