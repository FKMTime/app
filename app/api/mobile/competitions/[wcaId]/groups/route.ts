import { NextResponse } from "next/server";
import { requireMobileSession } from "@/lib/mobile/session";
import {
  getAllGroups,
  getMobileCompetitionByWcaId,
  getOngoingGroups,
} from "@/lib/data/mobile";

export const runtime = "nodejs";

// GET /api/mobile/competitions/:wcaId/groups            → all groups
// GET /api/mobile/competitions/:wcaId/groups?filter=ongoing → only ONGOING
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

  const filter = new URL(req.url).searchParams.get("filter");
  const groups =
    filter === "ongoing"
      ? await getOngoingGroups(competition.id)
      : await getAllGroups(competition.id);

  return NextResponse.json({ groups });
}
