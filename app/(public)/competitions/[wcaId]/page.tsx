import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  MapPin,
  PlayCircle,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCompetitorCount,
  getEventIdsForCompetition,
  getOngoingGroups,
  getPublicCompetitionByWcaId,
  getPublicCompetitionRoles,
  getRoundsForCompetition,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { GroupStatusBadge } from "@/components/public/group-status-badge";
import { LiveRefresh } from "@/components/live/live-refresh";

// Hub landing page for a single competition. Structure top → bottom:
//   1. LiveRefresh (invisible, wires SSE)
//   2. CompetitionHeader (title, dates, status pill, section tabs)
//   3. Quick-tile grid (Schedule / Results / Competitors)
//   4. "Happening now" — ONGOING groups; empty state when nothing live
//   5. Recent rounds — deep links into the results tables

export default async function CompetitionOverviewPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const competition = await getPublicCompetitionByWcaId(wcaId);
  if (!competition) notFound();

  const [ongoing, rounds, eventIds, competitorCount, roles] = await Promise.all([
    getOngoingGroups(competition.id),
    getRoundsForCompetition(competition.id),
    getEventIdsForCompetition(competition.id),
    getCompetitorCount(competition.id),
    getPublicCompetitionRoles(competition.id),
  ]);
  const delegateCount = roles.filter((r) => r.role === "DELEGATE").length;
  const organizerCount = roles.filter((r) => r.role === "ORGANIZER").length;

  return (
    <div className="space-y-6">
      <LiveRefresh wcaId={competition.wcaId} />
      <CompetitionHeader competition={competition} active="overview" />

      <p className="text-sm text-muted-foreground">
        This page updates live as the competition runs. Use the tabs above to
        browse the schedule, live results, competitors, and the delegate /
        organizer team.
      </p>

      {eventIds.length > 0 && (
        <section aria-labelledby="events-heading">
          <h2
            id="events-heading"
            className="mb-2 text-sm font-medium text-muted-foreground"
          >
            Events
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {eventIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs"
              >
                {id}
              </span>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="quick-tiles-heading">
        <h2 id="quick-tiles-heading" className="sr-only">
          Quick links
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickTile
            href={`/competitions/${competition.wcaId}/groups`}
            Icon={CalendarDays}
            title="Schedule"
            hint="All groups & rooms"
          />
          <QuickTile
            href={`/competitions/${competition.wcaId}/results`}
            Icon={Trophy}
            title="Results"
            hint={
              rounds.length === 0
                ? "No rounds yet"
                : `${rounds.length} round${rounds.length === 1 ? "" : "s"}`
            }
          />
          <QuickTile
            href={`/competitions/${competition.wcaId}/competitors`}
            Icon={Users}
            title="Competitors"
            hint={
              competitorCount === 0
                ? "Not registered yet"
                : `${competitorCount} people`
            }
          />
          <QuickTile
            href={`/competitions/${competition.wcaId}/organizers`}
            Icon={ShieldCheck}
            title="Team"
            hint={
              roles.length === 0
                ? "Not synced yet"
                : `${delegateCount} delegate${delegateCount === 1 ? "" : "s"} · ${organizerCount} org${organizerCount === 1 ? "" : "s"}`
            }
          />
        </div>
      </section>

      <section className="space-y-2" aria-labelledby="happening-now-heading">
        <div className="flex items-center gap-2">
          <PlayCircle
            className="h-4 w-4 text-sky-600 dark:text-sky-400"
            aria-hidden
          />
          <h2 id="happening-now-heading" className="text-base font-semibold">
            Happening now
          </h2>
        </div>
        {ongoing.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No groups are running right now. Live groups will appear here
              automatically.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ongoing.map((g) => (
              <li key={g.id}>
                <div className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/40">
                  {g.roomColor ? (
                    <span
                      aria-hidden
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: g.roomColor }}
                    />
                  ) : (
                    <MapPin
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{g.name}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {g.roomName ?? "No room"}
                    </div>
                  </div>
                  <GroupStatusBadge status={g.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="rounds-heading">
        <div className="flex items-center gap-2">
          <Trophy
            className="h-4 w-4 text-amber-500 dark:text-amber-400"
            aria-hidden
          />
          <h2 id="rounds-heading" className="text-base font-semibold">
            Rounds
          </h2>
        </div>
        {rounds.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No rounds have any results yet.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {rounds.map((r) => (
              <li key={`${r.eventId}-${r.roundId}`}>
                <Link
                  href={`/competitions/${competition.wcaId}/results/${encodeURIComponent(
                    r.roundId,
                  )}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.eventId}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.roundId}
                    </div>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuickTile({
  href,
  Icon,
  title,
  hint,
}: {
  href: string;
  Icon: typeof CalendarDays;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 font-medium">
            {title}
            <ChevronRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
    </Link>
  );
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const competition = await getPublicCompetitionByWcaId(wcaId);
  return {
    title: competition ? `${competition.name} · FKMTime` : "Competition · FKMTime",
  };
}
