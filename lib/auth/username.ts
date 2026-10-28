import type { User } from "@supabase/supabase-js";

export const USERNAME_EMAIL_DOMAIN = "shiye.local";
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,32}$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (!username) {
    return "请输入用户名。";
  }

  if (username !== username.trim() || /\s/.test(username)) {
    return "用户名不能包含空格。";
  }

  if (username.includes("@")) {
    return "用户名不能包含 @。";
  }

  if (!USERNAME_PATTERN.test(username)) {
    return "用户名只能包含字母、数字和下划线，且不超过 32 个字符。";
  }

  return null;
}

export function usernameToVirtualEmail(username: string): string {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

export function getAuthDisplayName(user: User | null): string {
  if (!user) {
    return "已登录用户";
  }

  const username = user.user_metadata?.username;
  const displayName = user.user_metadata?.display_name;

  if (typeof displayName === "string" && displayName.trim()) {
    return displayName.trim();
  }

  if (typeof username === "string" && username.trim()) {
    return username.trim();
  }

  return user.email?.split("@")[0] || "已登录用户";
}
