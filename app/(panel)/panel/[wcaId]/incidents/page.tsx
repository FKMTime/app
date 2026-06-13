import Link from "next/link";
import { requireDelegateAccess } from "@/lib/authz/panel";
import { PanelHeader } from "@/components/panel/panel-header";
import { getDelegateIncidents, getPanelPersons } from "@/lib/data/panel";
import { IncidentForm } from "@/components/panel/incident-form";
import { IncidentDeleteButton } from "@/components/panel/incident-delete-button";

const KIND_STYLES: Record<string, string> = {
  NOTEWORTHY: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  WARNING: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  MANUAL: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
};

export default async function IncidentsPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const access = await requireDelegateAccess(wcaId);
  const [incidents, persons] = await Promise.all([
    getDelegateIncidents(access.competition.id),
    getPanelPersons(access.competition.id),
  ]);

  return (
    <div className="space-y-6">
      <PanelHeader
        competition={access.competition}
        hasDelegateAccess={access.hasDelegateAccess}
        active="incidents"
      />

      <IncidentForm wcaId={wcaId} persons={persons} />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">
          Incidents ({incidents.length})
        </h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {incidents.map((i) => (
              <li key={i.id} className="space-y-1 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      KIND_STYLES[i.kind] ?? ""
                    }`}
                  >
                    {i.kind.toLowerCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {i.source.toLowerCase()}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {i.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </span>
                </div>
                <div className="text-sm">{i.description}</div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {i.person && (
                    <Link
                      href={`/competitions/${access.competition.wcaId}/competitors/${i.person.registrantId}`}
                      className="hover:underline"
                    >
                      #{i.person.registrantId} {i.person.name}
                    </Link>
                  )}
                  {i.attempt?.result && (
                    <Link
                      href={`/panel/${access.competition.wcaId}/results/${encodeURIComponent(i.attempt.result.roundId)}`}
                      className="hover:underline"
                    >
                      {i.attempt.result.eventId} · {i.attempt.result.roundId}
                      {" · attempt "}
                      {i.attempt.attemptNumber}
                    </Link>
                  )}
                  {i.createdBy?.name && <span>by {i.createdBy.name}</span>}
                  {i.source === "MANUAL" && (
                    <span className="ml-auto">
                      <IncidentDeleteButton
                        wcaId={access.competition.wcaId}
                        incidentId={i.id}
                      />
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
