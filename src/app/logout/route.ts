import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_CLEAR_PATHS,
  getExpiredAccessCookieOptions,
  serializeAccessCookie
} from "@/lib/auth/session";

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303
  });

  for (const path of ACCESS_COOKIE_CLEAR_PATHS) {
    response.headers.append(
      "Set-Cookie",
      serializeAccessCookie("", getExpiredAccessCookieOptions(path))
    );
  }

  return response;
}
