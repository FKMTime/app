import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getPublicCompetitionByWcaId,
  getRoundsForCompetition,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { LiveRefresh } from "@/components/live/live-refresh";

// Rounds index for a competition. Groups rounds by event, deep-links into
// per-round tables. Live updates via the shared LiveRefresh hook.
export default async function RoundsIndexPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const competition = await getPublicCompetitionByWcaId(wcaId);
  if (!competition) notFound();

  const rounds = await getRoundsForCompetition(competition.id);

  // Group by event.
  const byEvent = new Map<string, string[]>();
  for (const r of rounds) {
    const arr = byEvent.get(r.eventId) ?? [];
    arr.push(r.roundId);
    byEvent.set(r.eventId, arr);
  }

  return (
    <div className="space-y-6">
      <LiveRefresh wcaId={competition.wcaId} />
      <CompetitionHeader competition={competition} active="results" />

      <p className="text-sm text-muted-foreground">
        Rounds appear here as soon as any result has been entered. Pick a round
        to see the ranking with attempts and best time.
      </p>

      <section className="space-y-3" aria-labelledby="results-heading">
        <div className="flex items-center gap-2">
          <Trophy
            className="h-4 w-4 text-amber-500 dark:text-amber-400"
            aria-hidden
          />
          <h2 id="results-heading" className="text-base font-semibold">
            Results by event
          </h2>
        </div>

        {byEvent.size === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No results have been entered yet. This page updates live.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {[...byEvent.entries()].map(([eventId, roundIds]) => (
              <div key={eventId} className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {eventId}
                </div>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {roundIds.map((roundId) => (
                    <li key={roundId}>
                      <Link
                        href={`/competitions/${competition.wcaId}/results/${encodeURIComponent(
                          roundId,
                        )}`}
                        className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
                      >
                        <span className="truncate font-mono text-xs">
                          {roundId}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
