import Link from "next/link";
import { requirePanelAccess } from "@/lib/authz/panel";
import { PanelHeader } from "@/components/panel/panel-header";
import {
  getDelegateRoundResults,
  getOrganizerRoundResults,
} from "@/lib/data/panel";
import { attemptText, bestOf, formatCentis } from "@/lib/format/time";

export default async function PanelRoundDetailPage({
  params,
}: {
  params: Promise<{ wcaId: string; roundId: string }>;
}) {
  const { wcaId, roundId } = await params;
  const access = await requirePanelAccess(wcaId);

  // Branching at the data-layer call site keeps "delegate-only fields" out of
  // the organizer code path entirely — there's no shared row shape that could
  // accidentally surface a description.
  const results = access.hasDelegateAccess
    ? await getDelegateRoundResults(access.competition.id, roundId)
    : await getOrganizerRoundResults(access.competition.id, roundId);

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
      <PanelHeader
        competition={access.competition}
        hasDelegateAccess={access.hasDelegateAccess}
        active="results"
      />

      <section className="space-y-2">
        <Link
          href={`/panel/${access.competition.wcaId}/results`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All rounds
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
                  {access.hasDelegateAccess && (
                    <th className="px-3 py-2">Delegate notes</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.best === null ? "—" : i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.person.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.person.wcaId ?? "newcomer"} · #{r.person.registrantId}
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
                    {access.hasDelegateAccess && (
                      <td className="px-3 py-2 text-xs">
                        <DelegateNotesCell
                          attempts={
                            r.attempts as unknown as DelegateAttempt[]
                          }
                        />
                      </td>
                    )}
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

type DelegateAttempt = {
  id: string;
  attemptNumber: number;
  description: string | null;
  editedAt: Date | null;
  editedBy: { id: string; name: string | null } | null;
};

function DelegateNotesCell({ attempts }: { attempts: DelegateAttempt[] }) {
  const notes = attempts.filter(
    (a) => a.description || a.editedAt,
  );
  if (notes.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <ul className="space-y-1">
      {notes.map((a) => (
        <li key={a.id}>
          <span className="font-mono">A{a.attemptNumber}:</span>{" "}
          {a.description ? a.description : null}
          {a.editedAt && (
            <span className="ml-1 text-muted-foreground">
              (edited
              {a.editedBy?.name ? ` by ${a.editedBy.name}` : ""}
              {", "}
              {a.editedAt.toISOString().slice(0, 10)})
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
