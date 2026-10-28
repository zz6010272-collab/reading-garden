import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";

import {
  getAuthDisplayName,
  normalizeUsername,
  usernameToVirtualEmail,
  validateUsername,
} from "../lib/auth/username";

test("accepts letters, numbers, and underscores", () => {
  assert.equal(validateUsername("zhangsan"), null);
  assert.equal(validateUsername("reader_2026"), null);
  assert.equal(validateUsername("A1_b2"), null);
});

test("rejects @, spaces, and unsupported characters", () => {
  assert.equal(validateUsername("zhang@san"), "用户名不能包含 @。");
  assert.equal(validateUsername("zhang san"), "用户名不能包含空格。");
  assert.equal(validateUsername(" zhang"), "用户名不能包含空格。");
  assert.match(validateUsername("张三") ?? "", /只能包含字母、数字和下划线/);
});

test("normalizes usernames and creates virtual emails", () => {
  assert.equal(normalizeUsername("  ZhangSan  "), "zhangsan");
  assert.equal(usernameToVirtualEmail("ZhangSan"), "zhangsan@shiye.local");
});

test("uses profile metadata before email prefix for auth display", () => {
  const user = {
    email: "zhangsan@shiye.local",
    user_metadata: {
      username: "zhangsan",
      display_name: "ZhangSan",
    },
  } as unknown as User;

  assert.equal(getAuthDisplayName(user), "ZhangSan");
  assert.equal(getAuthDisplayName(null), "已登录用户");
});
