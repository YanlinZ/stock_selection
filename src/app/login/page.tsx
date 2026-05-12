import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeNextPath } from "@/lib/http";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ERROR_COPY: Record<string, string> = {
  "auth-required": "请先登录，登录后会回到刚才的页面。",
  "invalid-password": "密码不正确。",
  "missing-config": "缺少 AUTH_SECRET 或 APP_ACCESS_PASSWORD。"
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawNext = typeof params?.next === "string" ? params.next : "/";
  const nextPath = sanitizeNextPath(rawNext);
  const rawError = typeof params?.error === "string" ? params.error : undefined;
  const error = rawError ? ERROR_COPY[rawError] : undefined;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle>stock_selection</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/login" className="space-y-4" method="post">
            <input name="next" type="hidden" value={nextPath} />
            <div className="space-y-2">
              <Label htmlFor="password">访问密码</Label>
              <Input
                autoComplete="current-password"
                autoFocus
                id="password"
                name="password"
                required
                type="password"
              />
            </div>
            {error ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button className="w-full" type="submit">
              进入
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
