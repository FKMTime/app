import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDelegateAccess } from "@/lib/authz/panel";
import { PanelHeader } from "@/components/panel/panel-header";
import { getDelegateRoundResults } from "@/lib/data/panel";
import { AttemptEditRow } from "@/components/panel/attempt-edit-row";

export default async function EditRoundPage({
  params,
}: {
  params: Promise<{ wcaId: string; roundId: string }>;
}) {
  const { wcaId, roundId } = await params;
  const access = await requireDelegateAccess(wcaId);
  if (access.competition.status !== "FINISHED") {
    redirect(`/panel/${wcaId}/edit`);
  }

  const results = await getDelegateRoundResults(access.competition.id, roundId);
  const eventId = results[0]?.eventId ?? roundId.split("-")[0];

  return (
    <div className="space-y-6">
      <PanelHeader
        competition={access.competition}
        hasDelegateAccess={access.hasDelegateAccess}
        active="edit"
      />

      <section className="space-y-2">
        <Link
          href={`/panel/${access.competition.wcaId}/edit`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All rounds
        </Link>
        <h2 className="text-lg font-semibold">
          {eventId} · {roundId}
        </h2>

        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results in this round.</p>
        ) : (
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.id} className="rounded-md border">
                <div className="flex items-baseline justify-between border-b bg-muted/40 px-3 py-2 text-sm">
                  <div className="font-medium">{r.person.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.person.wcaId ?? "newcomer"} · #{r.person.registrantId}
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-3 py-1 w-12">#</th>
                      <th className="px-3 py-1 w-32">Time</th>
                      <th className="px-3 py-1">Notes</th>
                      <th className="px-3 py-1 w-48">Audit</th>
                      <th className="px-3 py-1 w-32" />
                    </tr>
                  </thead>
                  <tbody>
                    {r.attempts.map((a) => (
                      <AttemptEditRow
                        key={a.id}
                        wcaId={access.competition.wcaId}
                        attempt={{
                          id: a.id,
                          attemptNumber: a.attemptNumber,
                          value: a.value,
                          penalty: a.penalty,
                          status: a.status,
                          type: a.type,
                          replacedBy: a.replacedBy,
                          description: a.description,
                          editedAt: a.editedAt ? a.editedAt.toISOString() : null,
                          editedBy: a.editedBy,
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
