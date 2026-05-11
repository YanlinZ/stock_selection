import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, isValidAccessToken } from "@/lib/auth/session";

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!(await isValidAccessToken(token))) {
    redirect("/login");
  }

  return children;
}
