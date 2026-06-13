import Link from "next/link";
import { requireDelegateAccess } from "@/lib/authz/panel";
import { PanelHeader } from "@/components/panel/panel-header";
import { getPanelRoundsList } from "@/lib/data/panel";

export default async function EditOverviewPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const access = await requireDelegateAccess(wcaId);

  if (access.competition.status !== "FINISHED") {
    return (
      <div className="space-y-6">
        <PanelHeader
          competition={access.competition}
          hasDelegateAccess={access.hasDelegateAccess}
          active="edit"
        />
        <div className="rounded-md border bg-muted/40 p-4 text-sm">
          Post-competition editing is unlocked once the competition reaches{" "}
          <span className="font-mono">FINISHED</span>. During the comp, FKMTime
          remains the source of truth and the central app is a read-only
          mirror.
        </div>
      </div>
    );
  }

  const rounds = await getPanelRoundsList(access.competition.id);

  return (
    <div className="space-y-6">
      <PanelHeader
        competition={access.competition}
        hasDelegateAccess={access.hasDelegateAccess}
        active="edit"
      />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Pick a round to edit</h2>
        <p className="text-sm text-muted-foreground">
          Every change you make is attributed to your account and visible to
          other delegates.
        </p>

        {rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No results to edit.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {rounds.map((r) => (
              <li key={`${r.eventId}-${r.roundId}`}>
                <Link
                  href={`/panel/${access.competition.wcaId}/edit/${encodeURIComponent(r.roundId)}`}
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
