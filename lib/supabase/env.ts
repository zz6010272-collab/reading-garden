const PLACEHOLDER_PUBLISHABLE_KEY = "your-publishable-key";

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase 环境变量未配置完整，请检查 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。",
    );
  }

  if (publishableKey === PLACEHOLDER_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase publishable key 仍是示例值，请检查 .env.local 配置。",
    );
  }

  return { url, publishableKey };
}