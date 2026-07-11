import { NextResponse } from "next/server";
import { requireMobileSession } from "@/lib/mobile/session";
import {
  getMobileCompetitionByWcaId,
  getMyPersonInCompetition,
} from "@/lib/data/mobile";

export const runtime = "nodejs";

// Returns the signed-in user's own Person, assignments, and results for
// this competition. 404 if the user has no wcaUserId or isn't registered.
export async function GET(
  req: Request,
  context: { params: Promise<{ wcaId: string }> },
) {
  const s = await requireMobileSession(req);
  if (!s.ok) return NextResponse.json({ error: s.error }, { status: s.status });
  if (s.session.wcaUserId === null) {
    return NextResponse.json(
      { error: "Your WCA account has no WCA user id" },
      { status: 404 },
    );
  }

  const { wcaId } = await context.params;
  const competition = await getMobileCompetitionByWcaId(wcaId);
  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  const person = await getMyPersonInCompetition({
    competitionId: competition.id,
    wcaUserId: s.session.wcaUserId,
  });
  if (!person) {
    return NextResponse.json(
      { error: "You are not registered for this competition" },
      { status: 404 },
    );
  }
  return NextResponse.json({ person });
}
