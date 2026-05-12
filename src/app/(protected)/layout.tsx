import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, isValidAccessToken } from "@/lib/auth/session";
import { createLoginPath } from "@/lib/http";

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const nextPath = headerStore.get("x-stock-selection-path") ?? "/";

  if (!(await isValidAccessToken(token))) {
    redirect(createLoginPath(nextPath, "auth-required"));
  }

  return children;
}
