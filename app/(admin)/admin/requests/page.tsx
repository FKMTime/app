import Link from "next/link";
import {
  CalendarDays,
  ExternalLink,
  ListChecks,
  Mail,
  StickyNote,
  UserCircle,
} from "lucide-react";
import { prisma } from "@/prisma";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";
import { RequestActions } from "@/components/admin/request-actions";
import { Card, CardContent } from "@/components/ui/card";
import { PageIntro } from "@/components/admin/page-intro";
import { WCA_ORIGIN } from "@/lib/constants";

export default async function AdminRequestsPage() {
  const requests = await prisma.competition.findMany({
    where: { status: "REQUESTED" },
    include: {
      requestedBy: { select: { name: true, wcaId: true, email: true } },
    },
    orderBy: { requestedAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageIntro
        Icon={ListChecks}
        title="Pending requests"
        description="Organizers request FKMTime for a WCA competition they manage. Reviewing here means deciding whether to provision a proxy tunnel and mint an API key."
        secondary={
          requests.length === 0
            ? "Nothing to review right now."
            : `${requests.length} request${requests.length === 1 ? "" : "s"} awaiting review.`
        }
      />

      <Card className="border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30">
        <CardContent className="p-4 text-sm">
          <div className="mb-1 font-medium">What happens when you decide</div>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">Approve</strong> — the app
              calls fkm-proxy to create a tunnel, encrypts the returned secret,
              mints a one-time-reveal API key, and syncs delegate/organizer
              roles from WCA. The organizer sees the key on their dashboard.
            </li>
            <li>
              <strong className="text-foreground">Reject</strong> — the
              request is closed and your reason is shown to the organizer, who
              can resubmit later.
            </li>
          </ul>
        </CardContent>
      </Card>

      {requests.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            No pending requests. New requests from organizers will show up
            here.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-md border">
          {requests.map((c) => (
            <li key={c.id} className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <Link
                    href={`/admin/competitions/${c.id}`}
                    className="inline-flex items-center gap-1 truncate font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {c.startDate.toISOString().slice(0, 10)} →{" "}
                      {c.endDate.toISOString().slice(0, 10)}
                    </span>
                    <a
                      href={`${WCA_ORIGIN}/competitions/${encodeURIComponent(c.wcaId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-mono text-xs hover:underline"
                      title="Open on WCA"
                    >
                      {c.wcaId}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UserCircle className="h-3.5 w-3.5" aria-hidden />
                      {c.requestedBy.name ?? "unknown"}
                      {c.requestedBy.wcaId ? ` (${c.requestedBy.wcaId})` : ""}
                    </span>
                    {c.requestedBy.email && (
                      <a
                        href={`mailto:${c.requestedBy.email}`}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden />
                        {c.requestedBy.email}
                      </a>
                    )}
                  </div>
                  {c.requestNotes && (
                    <div className="mt-2 rounded-md bg-muted p-2 text-sm">
                      <div className="mb-0.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <StickyNote className="h-3.5 w-3.5" aria-hidden />
                        Note from organizer
                      </div>
                      {c.requestNotes}
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
