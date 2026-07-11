import { notFound } from "next/navigation";
import {
  Archive,
  CalendarDays,
  CommandIcon,
  ExternalLink,
  Info,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { prisma } from "@/prisma";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";
import { CompetitionAdminPanel } from "@/components/admin/competition-admin-panel";
import { DumpsList } from "@/components/admin/dumps-list";
import { AdminSection, PageIntro } from "@/components/admin/page-intro";
import { Card, CardContent } from "@/components/ui/card";
import { WCA_ORIGIN } from "@/lib/constants";

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
      dumps: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!competition) notFound();

  return (
    <div className="space-y-8">
      <PageIntro
        Icon={CommandIcon}
        title={competition.name}
        description={`${competition.startDate.toISOString().slice(0, 10)} → ${competition.endDate.toISOString().slice(0, 10)} · ${competition.wcaId}`}
        secondary={`Requested by ${competition.requestedBy.name ?? "unknown"}${
          competition.approvedBy
            ? ` · approved by ${competition.approvedBy.name ?? "unknown"}`
            : ""
        }`}
        actions={
          <div className="flex items-center gap-2">
            <a
              href={`${WCA_ORIGIN}/competitions/${encodeURIComponent(competition.wcaId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              title="Open on WCA"
            >
              WCA page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            <CompetitionStatusBadge status={competition.status} />
          </div>
        }
      />

      {competition.status === "REQUESTED" && (
        <Card className="border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="p-4 text-sm">
            <div className="mb-1 inline-flex items-center gap-1 font-medium">
              <Info className="h-4 w-4" aria-hidden />
              Not provisioned yet
            </div>
            The proxy tunnel and API key are created when this request is
            approved from the{" "}
            <a
              href="/admin/requests"
              className="text-primary underline-offset-2 hover:underline"
            >
              Requests queue
            </a>
            .
          </CardContent>
        </Card>
      )}

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

      <AdminSection
        Icon={Archive}
        title={`Database dumps (${competition.dumps.length})`}
        description="End-of-competition pg_dump uploads to Cloudflare R2. Downloading generates a 15-minute presigned URL."
      >
        <DumpsList
          dumps={competition.dumps.map((d) => ({
            id: d.id,
            objectKey: d.objectKey,
            sizeBytes: d.sizeBytes.toString(),
            uploadedAt: d.uploadedAt.toISOString(),
          }))}
        />
      </AdminSection>

      <AdminSection
        Icon={ShieldCheck}
        title={`Roles (${competition.roles.length})`}
        description="ORGANIZER and DELEGATE roles are synced from WCA (source: WCA) or added manually (source: MANUAL). Delegates gain access to incidents, attempt descriptions, and post-competition editing in the panel."
      >
        {competition.roles.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No roles synced yet. WCA roles are pulled at approval and again
              on each sign-in.
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y rounded-md border">
            {competition.roles.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-3 text-sm">
                <span
                  className="rounded bg-muted px-2 py-0.5 font-mono text-xs"
                  title="Role kind"
                >
                  {r.role}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1">
                    <UserCircle
                      className="h-3.5 w-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    {r.user.name ?? "unknown"}
                    {r.user.wcaId ? ` (${r.user.wcaId})` : ""}
                  </span>
                </span>
                <span
                  className="text-xs text-muted-foreground"
                  title={
                    r.source === "WCA"
                      ? "Synced from the WCA competition record"
                      : "Added manually by an admin"
                  }
                >
                  {r.source === "WCA" ? "from WCA" : "manual"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection
        Icon={CalendarDays}
        title="Requester"
        description="The organizer who submitted the FKMTime request. They are the only non-admin who can reveal secrets/keys for this competition."
      >
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium">
            {competition.requestedBy.name ?? "unknown"}
            {competition.requestedBy.wcaId
              ? ` (${competition.requestedBy.wcaId})`
              : ""}
          </div>
          {competition.requestedBy.email && (
            <a
              href={`mailto:${competition.requestedBy.email}`}
              className="text-xs text-muted-foreground hover:underline"
            >
              {competition.requestedBy.email}
            </a>
          )}
        </div>
      </AdminSection>
    </div>
  );
}
