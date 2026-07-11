import type { CompetitionStatus } from "@prisma/client";
import {
  CheckCircle2,
  CircleAlert,
  CircleDot,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAP: Record<
  CompetitionStatus,
  { label: string; className: string; Icon: LucideIcon }
> = {
  REQUESTED: {
    label: "Awaiting review",
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    Icon: Clock,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
    Icon: XCircle,
  },
  APPROVED: {
    label: "Ready",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
    Icon: CheckCircle2,
  },
  LIVE: {
    label: "Live",
    className: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
    Icon: CircleDot,
  },
  FINISHED: {
    label: "Finished",
    className:
      "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100",
    Icon: CircleAlert,
  },
};

export function CompetitionStatusBadge({
  status,
  className,
}: {
  status: CompetitionStatus;
  className?: string;
}) {
  const { label, className: styleClass, Icon } = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        styleClass,
        className,
      )}
    >
      <Icon
        className={cn("h-3 w-3", status === "LIVE" && "animate-pulse")}
        aria-hidden
      />
      {label}
    </span>
  );
}
