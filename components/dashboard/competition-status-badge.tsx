import type { CompetitionStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STYLES: Record<CompetitionStatus, string> = {
  REQUESTED: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  REJECTED: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  APPROVED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  LIVE: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  FINISHED: "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100",
};

export function CompetitionStatusBadge({ status }: { status: CompetitionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
