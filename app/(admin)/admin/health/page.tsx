import Link from "next/link";
import { prisma } from "@/prisma";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";

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
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Sync health</h1>
        <p className="text-sm text-muted-foreground">
          Last delta / heartbeat per competition, instance version, and synced
          entity counts. A red marker means no traffic for more than{" "}
          {STALE_MINUTES} minutes (heartbeat is meant to be ~5 min).
        </p>
      </div>

      {competitions.length === 0 ? (
        <p className="text-muted-foreground">No provisioned competitions.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2">Competition</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last delta</th>
                <th className="px-3 py-2">Last heartbeat</th>
                <th className="px-3 py-2">Instance</th>
                <th className="px-3 py-2">P / G / A / R / At / I</th>
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
                            className="inline-block h-2 w-2 rounded-full bg-red-500"
                            title="No traffic in over 15 minutes"
                          />
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
                      {c._count.persons}/{c._count.groups}/
                      {c._count.assignments}/{c._count.results}/
                      {c._count.attempts}/{c._count.incidents}
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
