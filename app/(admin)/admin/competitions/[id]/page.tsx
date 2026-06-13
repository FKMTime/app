import { notFound } from "next/navigation";
import { prisma } from "@/prisma";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";
import { CompetitionAdminPanel } from "@/components/admin/competition-admin-panel";

export default async function AdminCompetitionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { name: true, wcaId: true, email: true } },
      approvedBy: { select: { name: true } },
      apiKeys: { orderBy: { createdAt: "desc" } },
      roles: {
        include: {
          user: { select: { id: true, name: true, wcaId: true, email: true } },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!competition) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{competition.name}</h1>
          <div className="text-sm text-muted-foreground">
            {competition.startDate.toISOString().slice(0, 10)} →{" "}
            {competition.endDate.toISOString().slice(0, 10)} · WCA id:{" "}
            <span className="font-mono">{competition.wcaId}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Requested by {competition.requestedBy.name ?? "unknown"}
            {competition.requestedBy.wcaId
              ? ` (${competition.requestedBy.wcaId})`
              : ""}
            {competition.approvedBy
              ? ` · approved by ${competition.approvedBy.name ?? "unknown"}`
              : ""}
          </div>
        </div>
        <CompetitionStatusBadge status={competition.status} />
      </div>

      <CompetitionAdminPanel
        competitionId={competition.id}
        status={competition.status}
        proxyTunnelUrl={competition.proxyTunnelUrl}
        hasProxySecret={Boolean(competition.proxySecretEnc)}
        hasPendingApiKey={Boolean(competition.pendingApiKeyEnc)}
        apiKeys={competition.apiKeys.map((k) => ({
          id: k.id,
          lastFour: k.lastFour,
          createdAt: k.createdAt.toISOString(),
          expiresAt: k.expiresAt.toISOString(),
          revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
          lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
        }))}
      />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Roles ({competition.roles.length})</h2>
        {competition.roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roles synced yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {competition.roles.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                  {r.role}
                </span>
                <span className="flex-1">
                  {r.user.name ?? "unknown"}
                  {r.user.wcaId ? ` (${r.user.wcaId})` : ""}
                </span>
                <span className="text-xs text-muted-foreground">{r.source}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
