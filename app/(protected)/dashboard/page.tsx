import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CalendarPlus,
  ExternalLink,
  Trophy,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";
import { CompetitionSetup } from "@/components/dashboard/competition-setup";
import { NotificationOptIn } from "@/components/dashboard/notification-optin";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const wcaUserId = session!.user.wcaUserId;

  const [requests, myComps] = await Promise.all([
    prisma.competition.findMany({
      where: { requestedById: userId },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.competition.findMany({
      where: {
        status: { in: ["APPROVED", "LIVE"] },
        OR: [
          ...(wcaUserId ? [{ persons: { some: { wcaUserId } } }] : []),
          { roles: { some: { userId } } },
        ],
      },
      select: { id: true, name: true, wcaId: true, status: true, startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const displayName = session!.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage the FKMTime instances you organize, register for notifications
          on your groups, and jump into live results.
        </p>
      </header>

      {myComps.length > 0 && (
        <section aria-labelledby="my-comps-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy
              className="h-4 w-4 text-amber-500 dark:text-amber-400"
              aria-hidden
            />
            <h2 id="my-comps-heading" className="text-lg font-semibold">
              Where you&apos;re competing
            </h2>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {myComps.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/competitions/${c.wcaId}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" aria-hidden />
                      {c.startDate.toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <CompetitionStatusBadge status={c.status} />
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {myComps.length > 0 && (
        <section aria-labelledby="notifications-heading">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
                <CardTitle id="notifications-heading" className="text-base">
                  Group notifications
                </CardTitle>
              </div>
              <CardDescription>
                Get a push when a group you&apos;re assigned to starts —
                competing, judging, running, or scrambling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <NotificationOptIn competitionIds={myComps.map((c) => c.id)} />
              <div className="text-xs text-muted-foreground">
                Covers: {myComps.map((c) => c.name).join(", ")}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section aria-labelledby="my-requests-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarPlus
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <h2 id="my-requests-heading" className="text-lg font-semibold">
              Competitions you organize
            </h2>
          </div>
          <Link
            href="/dashboard/competitions"
            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
          >
            Request a new one <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {requests.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              You haven&apos;t requested any FKMTime competitions yet.{" "}
              <Link
                href="/dashboard/competitions"
                className="text-primary underline-offset-4 hover:underline"
              >
                Browse your WCA-managed comps
              </Link>{" "}
              to request one.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {requests.map((c) => {
              const provisioned =
                c.status === "APPROVED" ||
                c.status === "LIVE" ||
                c.status === "FINISHED";
              return (
                <li
                  key={c.id}
                  className="space-y-3 rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/competitions/${c.wcaId}`}
                          className="truncate font-medium hover:underline"
                        >
                          {c.name}
                        </Link>
                        <ExternalLink
                          className="h-3.5 w-3.5 text-muted-foreground"
                          aria-hidden
                        />
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        {c.startDate.toISOString().slice(0, 10)} →{" "}
                        {c.endDate.toISOString().slice(0, 10)}
                      </div>
                      {c.rejectionReason && c.status === "REJECTED" && (
                        <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                          Rejected: {c.rejectionReason}
                        </div>
                      )}
                    </div>
                    <CompetitionStatusBadge status={c.status} />
                  </div>
                  {provisioned && (
                    <CompetitionSetup
                      competitionId={c.id}
                      proxyTunnelUrl={c.proxyTunnelUrl}
                      hasProxySecret={Boolean(c.proxySecretEnc)}
                      hasPendingApiKey={Boolean(c.pendingApiKeyEnc)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
