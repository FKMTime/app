import { NextResponse } from "next/server";
import { requireMobileSession } from "@/lib/mobile/session";
import { getCompetitionsForMobileUser } from "@/lib/data/mobile";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const s = await requireMobileSession(req);
  if (!s.ok) return NextResponse.json({ error: s.error }, { status: s.status });

  const comps = await getCompetitionsForMobileUser({
    userId: s.session.userId,
    wcaUserId: s.session.wcaUserId,
  });
  return NextResponse.json({ competitions: comps });
}
