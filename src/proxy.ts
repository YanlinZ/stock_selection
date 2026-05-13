import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, findValidAccessToken } from "@/lib/auth/session";
import { createLoginPath } from "@/lib/http";

export async function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const tokens = request.cookies
    .getAll(ACCESS_COOKIE_NAME)
    .map((cookie) => cookie.value);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (!(await findValidAccessToken(tokens))) {
    return NextResponse.redirect(
      new URL(createLoginPath(nextPath, "auth-required"), request.url),
      { status: 303 }
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-stock-selection-path", nextPath);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    {
      source: "/",
      missing: [{ type: "header", key: "next-action" }]
    },
    {
      source: "/settings/:path*",
      missing: [{ type: "header", key: "next-action" }]
    },
    {
      source: "/health/:path*",
      missing: [{ type: "header", key: "next-action" }]
    },
    {
      source: "/dashboard/:path*",
      missing: [{ type: "header", key: "next-action" }]
    }
  ]
};
