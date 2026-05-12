import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, isValidAccessToken } from "@/lib/auth/session";
import { createLoginPath } from "@/lib/http";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (!(await isValidAccessToken(token))) {
    return NextResponse.redirect(
      new URL(createLoginPath(nextPath, "auth-required"), request.url),
      { status: 303 }
    );
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
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
  matcher: ["/", "/settings/:path*", "/health/:path*", "/dashboard/:path*"]
};
