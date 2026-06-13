import { notFound } from "next/navigation";
import {
  getAllGroups,
  getPublicCompetitionByWcaId,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { LiveRefresh } from "@/components/live/live-refresh";

const STATUS_STYLES: Record<string, string> = {
  UPCOMING: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  ONGOING: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  FINISHED: "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100",
};

function formatTime(d: Date | null): string {
  if (!d) return "—";
  return d
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const competition = await getPublicCompetitionByWcaId(wcaId);
  if (!competition) notFound();

  const groups = await getAllGroups(competition.id);

  return (
    <div className="space-y-6">
      <LiveRefresh wcaId={competition.wcaId} />
      <CompetitionHeader competition={competition} active="groups" />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Schedule</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No groups scheduled.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center gap-3 p-3">
                {g.roomColor && (
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: g.roomColor }}
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.roomName ?? "—"} · {formatTime(g.startTime)}
                    {g.endTime ? ` → ${formatTime(g.endTime)}` : ""}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[g.status] ?? ""
                  }`}
                >
                  {g.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
