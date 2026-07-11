import { NextResponse } from "next/server";
import { requireMobileSession } from "@/lib/mobile/session";
import { getMobileCompetitionByWcaId } from "@/lib/data/mobile";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: { params: Promise<{ wcaId: string }> },
) {
  const s = await requireMobileSession(req);
  if (!s.ok) return NextResponse.json({ error: s.error }, { status: s.status });

  const { wcaId } = await context.params;
  const competition = await getMobileCompetitionByWcaId(wcaId);
  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }
  return NextResponse.json({ competition });
}
