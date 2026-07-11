import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getAllGroups,
  getPublicCompetitionByWcaId,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { GroupStatusBadge } from "@/components/public/group-status-badge";
import { LiveRefresh } from "@/components/live/live-refresh";

function formatTime(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const competition = await getPublicCompetitionByWcaId(wcaId);
  if (!competition) notFound();

  const groups = await getAllGroups(competition.id);

  return (
    <div className="space-y-6">
      <LiveRefresh wcaId={competition.wcaId} />
      <CompetitionHeader competition={competition} active="schedule" />

      <p className="text-sm text-muted-foreground">
        Every group scheduled for this competition. The dot on the left is the
        room colour; the badge on the right shows whether the group is
        upcoming, running now, or already finished.
      </p>

      <section className="space-y-2" aria-labelledby="schedule-heading">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="schedule-heading" className="text-base font-semibold">
            Schedule
          </h2>
        </div>
        {groups.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No groups scheduled yet.
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y rounded-md border">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center gap-3 p-3">
                {g.roomColor ? (
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: g.roomColor }}
                  />
                ) : (
                  <MapPin
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{g.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {g.roomName ?? "No room"} · {formatTime(g.startTime)}
                    {g.endTime ? ` → ${formatTime(g.endTime)}` : ""}
                  </div>
                </div>
                <GroupStatusBadge status={g.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
