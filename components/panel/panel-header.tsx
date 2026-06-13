import Link from "next/link";
import type { CompetitionStatus } from "@prisma/client";
import { CompetitionStatusBadge } from "@/components/dashboard/competition-status-badge";

type Tab = {
  key: "overview" | "results" | "incidents" | "edit";
  title: string;
  href: string;
};

type Props = {
  competition: {
    wcaId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: CompetitionStatus;
  };
  hasDelegateAccess: boolean;
  active: Tab["key"];
};

export function PanelHeader({ competition, hasDelegateAccess, active }: Props) {
  const tabs: Tab[] = [
    { key: "overview", title: "Overview", href: `/panel/${competition.wcaId}` },
    { key: "results", title: "Results", href: `/panel/${competition.wcaId}/results` },
    ...(hasDelegateAccess
      ? [
          {
            key: "incidents" as const,
            title: "Incidents",
            href: `/panel/${competition.wcaId}/incidents`,
          },
        ]
      : []),
    ...(hasDelegateAccess && competition.status === "FINISHED"
      ? [
          {
            key: "edit" as const,
            title: "Post-comp edit",
            href: `/panel/${competition.wcaId}/edit`,
          },
        ]
      : []),
  ];

  const tabClass = (key: Tab["key"]) =>
    `rounded-md px-3 py-1.5 text-sm ${
      active === key
        ? "bg-muted font-medium text-foreground"
        : "text-muted-foreground hover:bg-muted/60"
    }`;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold leading-tight">
            {competition.name}
          </h1>
          <div className="text-sm text-muted-foreground">
            {competition.startDate.toISOString().slice(0, 10)} →{" "}
            {competition.endDate.toISOString().slice(0, 10)} · WCA id:{" "}
            <span className="font-mono">{competition.wcaId}</span>
          </div>
        </div>
        <CompetitionStatusBadge status={competition.status} />
      </div>
      <nav className="flex flex-wrap gap-1 border-b pb-2">
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} className={tabClass(t.key)}>
            {t.title}
          </Link>
        ))}
      </nav>
    </div>
  );
}
