import Link from "next/link";
import { prisma } from "@/prisma";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";
import { RequestActions } from "@/components/admin/request-actions";

export default async function AdminRequestsPage() {
  const requests = await prisma.competition.findMany({
    where: { status: "REQUESTED" },
    include: {
      requestedBy: { select: { name: true, wcaId: true, email: true } },
    },
    orderBy: { requestedAt: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pending requests</h1>

      {requests.length === 0 ? (
        <p className="text-muted-foreground">No pending requests.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {requests.map((c) => (
            <li key={c.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="font-medium">
                    <Link
                      href={`/admin/competitions/${c.id}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {c.startDate.toISOString().slice(0, 10)} →{" "}
                    {c.endDate.toISOString().slice(0, 10)} · WCA id:{" "}
                    <span className="font-mono">{c.wcaId}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Requested by {c.requestedBy.name ?? "unknown"}
                    {c.requestedBy.wcaId ? ` (${c.requestedBy.wcaId})` : ""}
                    {c.requestedBy.email ? ` · ${c.requestedBy.email}` : ""}
                  </div>
                  {c.requestNotes && (
                    <div className="mt-2 rounded-md bg-muted p-2 text-sm">
                      <span className="font-medium">Notes:</span> {c.requestNotes}
                    </div>
                  )}
                </div>
                <CompetitionStatusBadge status={c.status} />
              </div>
              <RequestActions competitionId={c.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
