import Link from "next/link";
import { requirePanelAccess } from "@/lib/authz/panel";
import { PanelHeader } from "@/components/panel/panel-header";
import { prisma } from "@/prisma";

export default async function PanelOverviewPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const access = await requirePanelAccess(wcaId);

  const counts = await prisma.competition.findUnique({
    where: { id: access.competition.id },
    select: {
      _count: {
        select: {
          persons: true,
          groups: true,
          results: true,
          attempts: true,
          incidents: true,
        },
      },
      syncStatus: { select: { lastHeartbeatAt: true, lastDeltaAt: true } },
    },
  });

  const roleSummary = [
    access.isAdmin ? "admin" : null,
    access.isDelegate ? "delegate" : null,
    access.isOrganizer ? "organizer" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <PanelHeader
        competition={access.competition}
        hasDelegateAccess={access.hasDelegateAccess}
        active="overview"
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Persons" value={counts?._count.persons ?? 0} />
        <Stat label="Groups" value={counts?._count.groups ?? 0} />
        <Stat label="Results" value={counts?._count.results ?? 0} />
        <Stat label="Attempts" value={counts?._count.attempts ?? 0} />
      </section>

      <section className="space-y-2 rounded-md border p-3 text-sm">
        <div className="font-medium">You are signed in as: {roleSummary}</div>
        <div className="text-muted-foreground">
          Last delta:{" "}
          {counts?.syncStatus?.lastDeltaAt?.toISOString().replace("T", " ").slice(0, 19) ?? "never"}
          {" · "}
          last heartbeat:{" "}
          {counts?.syncStatus?.lastHeartbeatAt?.toISOString().replace("T", " ").slice(0, 19) ?? "never"}
        </div>
        {access.competition.status !== "FINISHED" && access.hasDelegateAccess && (
          <div className="rounded bg-muted/60 p-2 text-muted-foreground">
            Post-competition editing is unlocked once the competition reaches{" "}
            <span className="font-mono">FINISHED</span>.
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Public view</h2>
        <p className="text-sm text-muted-foreground">
          The competitor-facing pages are linked below; the same data is shown
          there minus any delegate-only fields.
        </p>
        <Link
          href={`/competitions/${access.competition.wcaId}`}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          /competitions/{access.competition.wcaId} →
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
