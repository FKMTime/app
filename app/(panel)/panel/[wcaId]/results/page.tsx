import Link from "next/link";
import { requirePanelAccess } from "@/lib/authz/panel";
import { PanelHeader } from "@/components/panel/panel-header";
import { getPanelRoundsList } from "@/lib/data/panel";

export default async function PanelResultsListPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const access = await requirePanelAccess(wcaId);
  const rounds = await getPanelRoundsList(access.competition.id);

  return (
    <div className="space-y-6">
      <PanelHeader
        competition={access.competition}
        hasDelegateAccess={access.hasDelegateAccess}
        active="results"
      />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Rounds</h2>
        {rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No results have arrived yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {rounds.map((r) => (
              <li key={`${r.eventId}-${r.roundId}`}>
                <Link
                  href={`/panel/${access.competition.wcaId}/results/${encodeURIComponent(r.roundId)}`}
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
