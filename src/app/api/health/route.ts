import { NextResponse } from "next/server";

import { collectHealth } from "@/server/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await collectHealth({ checkDatabase: true });

  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503
  });
}
