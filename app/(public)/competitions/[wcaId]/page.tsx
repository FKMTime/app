import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOngoingGroups,
  getPublicCompetitionByWcaId,
  getRoundsForCompetition,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { LiveRefresh } from "@/components/live/live-refresh";

export default async function CompetitionOverviewPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const competition = await getPublicCompetitionByWcaId(wcaId);
  if (!competition) notFound();

  const [ongoing, rounds] = await Promise.all([
    getOngoingGroups(competition.id),
    getRoundsForCompetition(competition.id),
  ]);

  return (
    <div className="space-y-6">
      <LiveRefresh wcaId={competition.wcaId} />
      <CompetitionHeader competition={competition} active="overview" />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Happening now</h2>
        {ongoing.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No groups are running right now.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ongoing.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                {g.roomColor && (
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: g.roomColor }}
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium">{g.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {g.roomName ?? "—"}
                  </div>
                </div>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-900/40 dark:text-sky-200">
                  ongoing
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Results</h2>
        {rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No results have been entered yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {rounds.map((r) => (
              <li key={`${r.eventId}-${r.roundId}`}>
                <Link
                  href={`/competitions/${competition.wcaId}/results/${encodeURIComponent(
                    r.roundId,
                  )}`}
                  className="block rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <div className="font-medium">{r.eventId}</div>
                  <div className="text-xs text-muted-foreground">{r.roundId}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
