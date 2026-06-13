import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCompetitorByRegistrantId,
  getPublicCompetitionByWcaId,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { LiveRefresh } from "@/components/live/live-refresh";
import { attemptText, bestOf, formatCentis } from "@/lib/format/time";

const ROLE_BADGE: Record<string, string> = {
  COMPETITOR: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  JUDGE: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  RUNNER: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  SCRAMBLER: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
};

export default async function CompetitorPage({
  params,
}: {
  params: Promise<{ wcaId: string; registrantId: string }>;
}) {
  const { wcaId, registrantId } = await params;
  const numericId = Number(registrantId);
  if (!Number.isInteger(numericId)) notFound();

  const competition = await getPublicCompetitionByWcaId(wcaId);
  if (!competition) notFound();

  const person = await getCompetitorByRegistrantId(competition.id, numericId);
  if (!person) notFound();

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
        <div>
          <h2 className="text-lg font-semibold">{person.name}</h2>
          <div className="text-sm text-muted-foreground">
            {person.wcaId ?? "newcomer"}
            {person.countryIso2 ? ` · ${person.countryIso2}` : ""}
            {" · #"}
            {person.registrantId}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">Assignments</h3>
        {person.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {person.assignments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 p-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    ROLE_BADGE[a.role] ?? ""
                  }`}
                >
                  {a.role.toLowerCase()}
                </span>
                <div className="flex-1 text-sm">
                  <div className="font-medium">{a.group.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.group.roomName ?? "—"} · {a.group.status.toLowerCase()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">Results</h3>
        {person.results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results yet.</p>
        ) : (
          <ul className="space-y-2">
            {person.results.map((r) => {
              const best = bestOf(r.attempts);
              return (
                <li
                  key={r.id}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/competitions/${competition.wcaId}/results/${encodeURIComponent(
                        r.roundId,
                      )}`}
                      className="font-medium hover:underline"
                    >
                      {r.eventId} · {r.roundId}
                    </Link>
                    <span className="font-mono">
                      best {best === null ? "—" : formatCentis(best)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm">
                    {r.attempts.map((a) => (
                      <span key={a.id}>{attemptText(a)}</span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
