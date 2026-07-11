import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  Gavel,
  Hourglass,
  MapPin,
  Shuffle,
  Trophy,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCompetitorByRegistrantId,
  getPublicCompetitionByWcaId,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { GroupStatusBadge } from "@/components/public/group-status-badge";
import { LiveRefresh } from "@/components/live/live-refresh";
import { attemptText, bestOf, formatCentis } from "@/lib/format/time";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_META: Record<
  string,
  { label: string; className: string; Icon: LucideIcon }
> = {
  COMPETITOR: {
    label: "Competing",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
    Icon: User,
  },
  JUDGE: {
    label: "Judging",
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    Icon: Gavel,
  },
  RUNNER: {
    label: "Running",
    className: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
    Icon: Hourglass,
  },
  SCRAMBLER: {
    label: "Scrambling",
    className:
      "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
    Icon: Shuffle,
  },
};

export default async function CompetitorPage({
  params,
}: {
  params: Promise<{ wcaId: string; registrantId: string }>;
}) {
  const { wcaId, registrantId } = await params;
  const numericId = Number(registrantId);
  if (!Number.isInteger(numericId)) notFound();

  const competition = await getPublicCompetitionByWcaId(wcaId);
  if (!competition) notFound();

  const person = await getCompetitorByRegistrantId(competition.id, numericId);
  if (!person) notFound();

  return (
    <div className="space-y-6">
      <LiveRefresh wcaId={competition.wcaId} />
      <CompetitionHeader competition={competition} active="competitors" />

      <section className="space-y-3">
        <Link
          href={`/competitions/${competition.wcaId}/competitors`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          All competitors
        </Link>

        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <User className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{person.name}</h2>
            <div className="text-sm text-muted-foreground">
              {person.wcaId ?? "newcomer"}
              {person.countryIso2 ? ` · ${person.countryIso2}` : ""}
              {" · #"}
              {person.registrantId}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">Assignments</h3>
        {person.assignments.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No assignments yet.
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y rounded-md border">
            {person.assignments.map((a) => {
              const meta = ROLE_META[a.role];
              const Icon = meta?.Icon ?? User;
              return (
                <li key={a.id} className="flex items-center gap-3 p-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      meta?.className,
                    )}
                  >
                    <Icon className="h-3 w-3" aria-hidden />
                    {meta?.label ?? a.role.toLowerCase()}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="truncate font-medium">{a.group.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {a.group.roomName ?? "No room"}
                    </div>
                  </div>
                  <GroupStatusBadge status={a.group.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Trophy
            className="h-4 w-4 text-amber-500 dark:text-amber-400"
            aria-hidden
          />
          <h3 className="text-base font-semibold">Results</h3>
        </div>
        {person.results.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No results yet.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {person.results.map((r) => {
              const best = bestOf(r.attempts);
              return (
                <li key={r.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/competitions/${competition.wcaId}/results/${encodeURIComponent(
                        r.roundId,
                      )}`}
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                    >
                      {r.eventId} · <span className="font-mono">{r.roundId}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <span className="font-mono">
                      best {best === null ? "—" : formatCentis(best)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm">
                    {r.attempts.map((a) => (
                      <span key={a.id}>{attemptText(a)}</span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
