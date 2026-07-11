import Link from "next/link";
import { ActivityIcon, CircleAlert } from "lucide-react";
import { prisma } from "@/prisma";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";
import { PageIntro } from "@/components/admin/page-intro";
import { Card, CardContent } from "@/components/ui/card";

// A comp is "stale" if it's APPROVED/LIVE and we haven't seen any traffic
// (delta or heartbeat) in this many minutes. Configurable later; the design
// doc says the instance heartbeats every ~5 min, so 15 is a comfortable
// 3x buffer.
const STALE_MINUTES = 15;

function formatRelative(d: Date | null): string {
  if (!d) return "never";
  const ms = Date.now() - d.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminHealthPage() {
  const competitions = await prisma.competition.findMany({
    where: { status: { in: ["APPROVED", "LIVE", "FINISHED"] } },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    include: {
      syncStatus: true,
      _count: {
        select: {
          persons: true,
          groups: true,
          assignments: true,
          results: true,
          attempts: true,
          incidents: true,
        },
      },
    },
  });

  const now = Date.now();

  return (
    <div className="space-y-6">
      <PageIntro
        Icon={ActivityIcon}
        title="Sync health"
        description="Are provisioned instances actively pushing data? A red dot means no delta or heartbeat has arrived in over 15 minutes (heartbeat is meant to be every ~5 min)."
        secondary="FINISHED comps are shown but not flagged — they stop syncing on purpose."
      />

      <Card className="border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30">
        <CardContent className="p-4 text-sm">
          <div className="mb-1 font-medium">Column reference</div>
          <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <li>
              <strong className="text-foreground">Last delta</strong> — most
              recent change-push (debounced, on-write).
            </li>
            <li>
              <strong className="text-foreground">Last heartbeat</strong> —
              most recent full-state snapshot (every ~5 min).
            </li>
            <li>
              <strong className="text-foreground">Instance</strong> — instance
              version string, useful when tracing bugs to a build.
            </li>
            <li>
              <strong className="text-foreground">Rows</strong> — persons,
              groups, assignments, results, attempts, incidents.
            </li>
          </ul>
        </CardContent>
      </Card>

      {competitions.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            No provisioned competitions to monitor yet.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2">Competition</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" title="Most recent /api/sync/delta write">
                  Last delta
                </th>
                <th className="px-3 py-2" title="Most recent /api/sync/state (full-snapshot) write">
                  Last heartbeat
                </th>
                <th className="px-3 py-2">Instance</th>
                <th
                  className="px-3 py-2"
                  title="Persons · Groups · Assignments · Results · Attempts · Incidents"
                >
                  Rows (P·G·A·R·At·I)
                </th>
              </tr>
            </thead>
            <tbody>
              {competitions.map((c) => {
                const last =
                  c.syncStatus?.lastDeltaAt ??
                  c.syncStatus?.lastHeartbeatAt ??
                  null;
                const stale =
                  c.status !== "FINISHED" &&
                  (!last || now - last.getTime() > STALE_MINUTES * 60 * 1000);
                return (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/competitions/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {c.wcaId}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CompetitionStatusBadge status={c.status} />
                        {stale && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-200"
                            title={`No traffic in over ${STALE_MINUTES} minutes`}
                          >
                            <CircleAlert className="h-3 w-3" aria-hidden />
                            stale
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatRelative(c.syncStatus?.lastDeltaAt ?? null)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatRelative(c.syncStatus?.lastHeartbeatAt ?? null)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {c.syncStatus?.instanceVersion ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {c._count.persons}·{c._count.groups}·
                      {c._count.assignments}·{c._count.results}·
                      {c._count.attempts}·{c._count.incidents}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
