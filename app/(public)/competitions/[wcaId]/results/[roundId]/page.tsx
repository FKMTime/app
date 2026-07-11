import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Medal, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getPublicCompetitionByWcaId,
  getResultsForRound,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { LiveRefresh } from "@/components/live/live-refresh";
import { attemptText, bestOf, formatCentis } from "@/lib/format/time";
import { cn } from "@/lib/utils";

const MEDAL_COLOR = [
  "text-amber-500 dark:text-amber-400",
  "text-slate-400 dark:text-slate-300",
  "text-orange-500 dark:text-orange-400",
];

export default async function RoundResultsPage({
  params,
}: {
  params: Promise<{ wcaId: string; roundId: string }>;
}) {
  const { wcaId, roundId } = await params;
  const competition = await getPublicCompetitionByWcaId(wcaId);
  if (!competition) notFound();

  const results = await getResultsForRound(competition.id, roundId);

  // Rank by best (lower wins); rows without any usable attempt go last.
  const ranked = results
    .map((r) => ({ ...r, best: bestOf(r.attempts) }))
    .sort((a, b) => {
      if (a.best === null && b.best === null) return 0;
      if (a.best === null) return 1;
      if (b.best === null) return -1;
      return a.best - b.best;
    });

  const eventId = ranked[0]?.eventId ?? roundId.split("-")[0];

  return (
    <div className="space-y-6">
      <LiveRefresh wcaId={competition.wcaId} />
      <CompetitionHeader competition={competition} active="results" />

      <section className="space-y-3">
        <Link
          href={`/competitions/${competition.wcaId}/results`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          All rounds
        </Link>

        <div className="flex items-center gap-2">
          <Trophy
            className="h-5 w-5 text-amber-500 dark:text-amber-400"
            aria-hidden
          />
          <h2 className="text-lg font-semibold">
            {eventId} <span className="text-muted-foreground">·</span>{" "}
            <span className="font-mono">{roundId}</span>
          </h2>
        </div>

        {ranked.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No results in this round yet. This page updates live.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr className="text-left">
                  <th className="w-10 px-3 py-2">#</th>
                  <th className="px-3 py-2">Competitor</th>
                  <th className="px-3 py-2">Best</th>
                  <th className="px-3 py-2">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => {
                  const rank = r.best === null ? null : i + 1;
                  const isMedal = rank !== null && rank <= 3;
                  return (
                    <tr key={r.id} className="border-t align-top">
                      <td className="px-3 py-2">
                        {rank === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : isMedal ? (
                          <span className="inline-flex items-center gap-1">
                            <Medal
                              className={cn("h-4 w-4", MEDAL_COLOR[rank - 1])}
                              aria-hidden
                            />
                            <span className="font-semibold">{rank}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{rank}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/competitions/${competition.wcaId}/competitors/${r.person.registrantId}`}
                          className="font-medium hover:underline"
                        >
                          {r.person.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {r.person.wcaId ?? "newcomer"}
                          {r.person.countryIso2 ? ` · ${r.person.countryIso2}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {r.best === null ? "—" : formatCentis(r.best)}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {r.attempts.map((a) => (
                            <span key={a.id}>{attemptText(a)}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
