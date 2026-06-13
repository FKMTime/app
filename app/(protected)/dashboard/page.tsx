import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";
import { CompetitionSetup } from "@/components/dashboard/competition-setup";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const requests = await prisma.competition.findMany({
    where: { requestedById: userId },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">My competitions</h1>
          <Link
            href="/dashboard/competitions"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Request a new one →
          </Link>
        </div>

        {requests.length === 0 ? (
          <p className="text-muted-foreground">
            You haven&apos;t requested any FKMTime competitions yet.{" "}
            <Link
              href="/dashboard/competitions"
              className="text-primary underline-offset-4 hover:underline"
            >
              Browse your WCA-managed comps
            </Link>{" "}
            to request one.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {requests.map((c) => {
              const provisioned =
                c.status === "APPROVED" ||
                c.status === "LIVE" ||
                c.status === "FINISHED";
              return (
                <li key={c.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-muted-foreground">
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
