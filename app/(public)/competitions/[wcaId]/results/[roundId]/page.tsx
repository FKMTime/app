import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicCompetitionByWcaId,
  getResultsForRound,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { LiveRefresh } from "@/components/live/live-refresh";
import { attemptText, bestOf, formatCentis } from "@/lib/format/time";

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
      <CompetitionHeader competition={competition} />

      <section className="space-y-2">
        <Link
          href={`/competitions/${competition.wcaId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Overview
        </Link>
        <h2 className="text-lg font-semibold">
          {eventId} · {roundId}
        </h2>

        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No results in this round yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 w-8">#</th>
                  <th className="px-3 py-2">Competitor</th>
                  <th className="px-3 py-2">Best</th>
                  <th className="px-3 py-2">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.best === null ? "—" : i + 1}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

