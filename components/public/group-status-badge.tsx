import type { GroupStatus } from "@prisma/client";
import { CheckCircle2, CircleDot, Clock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MAP: Record<GroupStatus, { label: string; className: string; Icon: LucideIcon; live: boolean }> = {
  UPCOMING: {
    label: "Upcoming",
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    Icon: Clock,
    live: false,
  },
  ONGOING: {
    label: "Ongoing",
    className: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
    Icon: CircleDot,
    live: true,
  },
  FINISHED: {
    label: "Finished",
    className:
      "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100",
    Icon: CheckCircle2,
    live: false,
  },
};

export function GroupStatusBadge({
  status,
  className,
}: {
  status: GroupStatus;
  className?: string;
}) {
  const { label, className: styleClass, Icon, live } = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        styleClass,
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", live && "animate-pulse")} aria-hidden />
      {label}
    </span>
  );
}
