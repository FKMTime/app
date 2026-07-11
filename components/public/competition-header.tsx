import Link from "next/link";
import type { CompetitionStatus } from "@prisma/client";
import {
  CalendarDays,
  LayoutDashboard,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";
import { cn } from "@/lib/utils";

type Props = {
  competition: {
    wcaId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: CompetitionStatus;
  };
  active?: "overview" | "schedule" | "results" | "competitors" | "team";
};

const TABS = [
  { key: "overview" as const, label: "Overview", href: "", Icon: LayoutDashboard },
  { key: "schedule" as const, label: "Schedule", href: "/groups", Icon: CalendarDays },
  { key: "results" as const, label: "Results", href: "/results", Icon: Trophy },
  { key: "competitors" as const, label: "Competitors", href: "/competitors", Icon: Users },
  { key: "team" as const, label: "Team", href: "/organizers", Icon: ShieldCheck },
];

export function CompetitionHeader({ competition, active }: Props) {
  const start = competition.startDate.toISOString().slice(0, 10);
  const end = competition.endDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
            {competition.name}
          </h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden />
            <span>
              {start}
              {start !== end && <> → {end}</>}
            </span>
          </div>
        </div>
        <CompetitionStatusBadge status={competition.status} />
      </div>
      <nav
        aria-label="Competition sections"
        className="-mx-1 flex gap-1 overflow-x-auto border-b pb-1"
      >
        {TABS.map(({ key, label, href, Icon }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={`/competitions/${competition.wcaId}${href}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

