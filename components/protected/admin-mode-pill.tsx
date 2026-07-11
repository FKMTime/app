import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Persistent "you are in an elevated context" indicator. Two variants:
//   default : shows on any protected page for an admin, "Admin"
//   strong  : shows on /admin/* pages, "Admin mode" with a heavier outline
// The visual weight escalates so users can't miss that they're on an admin
// route while still knowing they *are* an admin on other pages.
export function AdminModePill({
  variant = "default",
  className,
}: {
  variant?: "default" | "strong";
  className?: string;
}) {
  const isStrong = variant === "strong";
  return (
    <span
      title={
        isStrong
          ? "You are on an admin page"
          : "You are signed in as an admin"
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full text-xs font-medium",
        isStrong
          ? "border-2 border-rose-400 bg-rose-100 px-2.5 py-0.5 text-rose-800 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-100"
          : "border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
        className,
      )}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden />
      {isStrong ? "Admin mode" : "Admin"}
    </span>
  );
}
