import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

const protectedRoutePrefixes = ["/library", "/write", "/import", "/settings"];
const authRoutePaths = new Set(["/login", "/register"]);

function isProtectedPath(pathname: string) {
  return protectedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectWithCookies(
  request: NextRequest,
  targetPath: string,
  sourceResponse: NextResponse,
) {
  const redirectResponse = NextResponse.redirect(
    new URL(targetPath, request.url),
  );

  for (const cookie of sourceResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // getClaims verifies the token instead of trusting the raw session cookie.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);
  const pathname = request.nextUrl.pathname;

  if (!isAuthenticated && isProtectedPath(pathname)) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  if (isAuthenticated && authRoutePaths.has(pathname)) {
    return redirectWithCookies(request, "/library", supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api/supabase|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};