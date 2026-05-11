import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  createAccessToken,
  getAccessCookieOptions,
  passwordsMatch
} from "@/lib/auth/session";
import { sanitizeNextPath } from "@/lib/http";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? "/"));
  const configuredPassword = process.env.APP_ACCESS_PASSWORD;
  const authSecret = process.env.AUTH_SECRET;

  if (!configuredPassword || !authSecret) {
    return redirectToLogin(request, "missing-config", nextPath);
  }

  if (!passwordsMatch(password, configuredPassword)) {
    return redirectToLogin(request, "invalid-password", nextPath);
  }

  const token = await createAccessToken(authSecret, configuredPassword);
  const response = NextResponse.redirect(new URL(nextPath, request.url), {
    status: 303
  });

  response.cookies.set(ACCESS_COOKIE_NAME, token, getAccessCookieOptions());

  return response;
}

function redirectToLogin(request: Request, error: string, nextPath: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);

  if (nextPath !== "/") {
    url.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(url, { status: 303 });
}
