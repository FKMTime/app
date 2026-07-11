import { CalendarDays, CalendarPlus, MapPin } from "lucide-react";
import { getUpcomingManageableCompetitions } from "@/actions/getUpcomingManageableCompetitions";
import { prisma } from "@/prisma";
import { RequestCompetitionButton } from "@/components/dashboard/request-competition-button";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";
import { Card, CardContent } from "@/components/ui/card";

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

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <CalendarPlus
            className="h-5 w-5 text-muted-foreground"
            aria-hidden
          />
          <h1 className="text-2xl font-semibold">Request a competition</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          These are the upcoming competitions you manage on WCA. Request
          FKMTime for one and an admin will provision the proxy tunnel and API
          key.
        </p>
      </div>

      {competitions.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            You don&apos;t have any upcoming competitions you manage on WCA.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-md border">
          {competitions.map((c) => {
            const status = byWcaId.get(c.id);
            return (
              <li key={c.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {c.start_date} → {c.end_date}
                    </span>
                    {c.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        {c.city}
                      </span>
                    )}
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
      )}
    </div>
  );
}
