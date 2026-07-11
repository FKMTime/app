import type { LucideIcon } from "lucide-react";

// Reusable admin page header. Every admin page uses this so users always get:
//   - a clear title with an icon that matches the sidebar entry,
//   - a one-line description of what this page is *for*,
//   - and an optional secondary line for deeper context.
// Consistent shape → less cognitive load when navigating.
export function PageIntro({
  Icon,
  title,
  description,
  secondary,
  actions,
}: {
  Icon: LucideIcon;
  title: string;
  description: string;
  secondary?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          {secondary && (
            <p className="text-xs text-muted-foreground">{secondary}</p>
          )}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}

// Descriptive section wrapper — a short heading with an optional explanation
// and an icon. Use whenever a section on an admin page needs a "what does
// this do / what does this list contain" caption.
export function AdminSection({
  Icon,
  title,
  description,
  children,
  actions,
}: {
  Icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {Icon && (
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
