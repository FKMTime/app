import Link from "next/link";
import { CalendarDays, CommandIcon, KeyRound, UserRound, Users } from "lucide-react";
import { prisma } from "@/prisma";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageIntro } from "@/components/admin/page-intro";

export default async function AdminCompetitionsPage() {
  const competitions = await prisma.competition.findMany({
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
    include: {
      requestedBy: { select: { name: true } },
      _count: { select: { apiKeys: true, roles: true, persons: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageIntro
        Icon={CommandIcon}
        title="Competitions"
        description="Every competition ever requested — approved, rejected, live, or finished. Click one to inspect its proxy tunnel, API keys, roles, and dumps."
        secondary={`${competitions.length} total`}
      />

      {competitions.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            No competitions yet. Approvals from the Requests queue show up
            here.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-md border">
          {competitions.map((c) => (
            <li key={c.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <Link
                  href={`/admin/competitions/${c.id}`}
                  className="truncate font-medium hover:underline"
                >
                  {c.name}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    {c.startDate.toISOString().slice(0, 10)} →{" "}
                    {c.endDate.toISOString().slice(0, 10)}
                  </span>
                  <span className="font-mono text-xs">{c.wcaId}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span
                    className="inline-flex items-center gap-1"
                    title="API keys ever minted for this competition (revoked + active)"
                  >
                    <KeyRound className="h-3.5 w-3.5" aria-hidden />
                    {c._count.apiKeys} key{c._count.apiKeys === 1 ? "" : "s"}
                  </span>
                  <span
                    className="inline-flex items-center gap-1"
                    title="ORGANIZER + DELEGATE rows (synced from WCA + manual overrides)"
                  >
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {c._count.roles} role{c._count.roles === 1 ? "" : "s"}
                  </span>
                  <span
                    className="inline-flex items-center gap-1"
                    title="Synced competitors so far"
                  >
                    <UserRound className="h-3.5 w-3.5" aria-hidden />
                    {c._count.persons} people
                  </span>
                  <span title="Who submitted the initial FKMTime request">
                    · requested by {c.requestedBy.name ?? "unknown"}
                  </span>
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
