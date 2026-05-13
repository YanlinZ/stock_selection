import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, findValidAccessToken } from "@/lib/auth/session";
import { createLoginPath } from "@/lib/http";

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const tokens = cookieStore
    .getAll(ACCESS_COOKIE_NAME)
    .map((cookie) => cookie.value);
  const nextPath = headerStore.get("x-stock-selection-path") ?? "/";

  if (!(await findValidAccessToken(tokens))) {
    redirect(createLoginPath(nextPath, "auth-required"));
  }

  return children;
}
