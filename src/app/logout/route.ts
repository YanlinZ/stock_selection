import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME } from "@/lib/auth/session";

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303
  });

  response.cookies.set(ACCESS_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
