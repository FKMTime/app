import Link from "next/link";
import { prisma } from "@/prisma";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";

export default async function AdminCompetitionsPage() {
  const competitions = await prisma.competition.findMany({
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
    include: {
      requestedBy: { select: { name: true } },
      _count: { select: { apiKeys: true, roles: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Competitions</h1>
      {competitions.length === 0 ? (
        <p className="text-muted-foreground">No competitions yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {competitions.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <Link
                  href={`/admin/competitions/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.name}
                </Link>
                <div className="text-sm text-muted-foreground">
                  {c.startDate.toISOString().slice(0, 10)} →{" "}
                  {c.endDate.toISOString().slice(0, 10)} · WCA id:{" "}
                  <span className="font-mono">{c.wcaId}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {c._count.apiKeys} key(s) · {c._count.roles} role(s) ·
                  requested by {c.requestedBy.name ?? "unknown"}
                </div>
              </div>
              <CompetitionStatusBadge status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
