import { getUpcomingManageableCompetitions } from "@/actions/getUpcomingManageableCompetitions";
import { prisma } from "@/prisma";
import { RequestCompetitionButton } from "@/components/dashboard/request-competition-button";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";

export default async function ManageableCompetitionsPage() {
  const competitions = await getUpcomingManageableCompetitions();
  const wcaIds = competitions.map((c) => c.id);

  const existing = wcaIds.length
    ? await prisma.competition.findMany({
        where: { wcaId: { in: wcaIds } },
        select: { wcaId: true, status: true },
      })
    : [];
  const byWcaId = new Map(existing.map((e) => [e.wcaId, e.status]));

  if (competitions.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Request a competition</h1>
        <p className="text-muted-foreground">
          You don&apos;t have any upcoming competitions you manage on WCA.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Request a competition</h1>
        <p className="text-sm text-muted-foreground">
          These are the upcoming competitions you manage on WCA. Request
          FKMTime for one and an admin will provision the proxy tunnel and an
          API key.
        </p>
      </div>

      <ul className="divide-y rounded-md border">
        {competitions.map((c) => {
          const status = byWcaId.get(c.id);
          return (
            <li key={c.id} className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-muted-foreground">
                  {c.start_date} → {c.end_date}
                  {c.city ? ` · ${c.city}` : ""}
                </div>
              </div>
              {status ? (
                <CompetitionStatusBadge status={status} />
              ) : (
                <RequestCompetitionButton wcaId={c.id} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
