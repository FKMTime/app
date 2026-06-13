import Link from "next/link";
import type { CompetitionStatus } from "@prisma/client";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";

type Props = {
  competition: {
    wcaId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: CompetitionStatus;
  };
  active?: "overview" | "groups";
};

export function CompetitionHeader({ competition, active }: Props) {
  const linkClass = (kind: "overview" | "groups") =>
    `rounded-md px-3 py-1.5 text-sm ${
      active === kind
        ? "bg-muted font-medium text-foreground"
        : "text-muted-foreground hover:bg-muted/60"
    }`;
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
            {competition.name}
          </h1>
          <div className="text-sm text-muted-foreground">
            {competition.startDate.toISOString().slice(0, 10)} →{" "}
            {competition.endDate.toISOString().slice(0, 10)}
          </div>
        </div>
        <CompetitionStatusBadge status={competition.status} />
      </div>
      <nav className="flex gap-1 border-b pb-2 text-sm">
        <Link
          href={`/competitions/${competition.wcaId}`}
          className={linkClass("overview")}
        >
          Overview
        </Link>
        <Link
          href={`/competitions/${competition.wcaId}/groups`}
          className={linkClass("groups")}
        >
          Schedule
        </Link>
      </nav>
    </div>
  );
}
