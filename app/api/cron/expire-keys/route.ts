import { NextResponse } from "next/server";
import { prisma } from "@/prisma";

// Marks any ApiKey rows past their expiresAt as revoked. Idempotent — running
// the job twice on the same minute is a no-op. Invoke from host cron with:
//   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/expire-keys
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  const authz = req.headers.get("authorization") ?? "";
  if (authz !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const result = await prisma.apiKey.updateMany({
    where: { revokedAt: null, expiresAt: { lt: now } },
    data: { revokedAt: now },
  });

  return NextResponse.json({ revoked: result.count, at: now.toISOString() });
}

// Convenience GET so smoke checks don't need to switch verbs.
export async function GET(req: Request) {
  return POST(req);
}
