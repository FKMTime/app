import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCompetitorList,
  getPublicCompetitionByWcaId,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { CompetitorSearch } from "@/components/public/competitor-search";
import { LiveRefresh } from "@/components/live/live-refresh";

export default async function CompetitorsIndexPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const competition = await getPublicCompetitionByWcaId(wcaId);
  if (!competition) notFound();

  const competitors = await getCompetitorList(competition.id);

  return (
    <div className="space-y-6">
      <LiveRefresh wcaId={competition.wcaId} />
      <CompetitionHeader competition={competition} active="competitors" />

      <p className="text-sm text-muted-foreground">
        Everyone registered for this competition. Search by name, WCA ID, or
        country, then tap a person to see their assignments and results.
      </p>

      <section className="space-y-3" aria-labelledby="competitors-heading">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="competitors-heading" className="text-base font-semibold">
            {competitors.length}{" "}
            {competitors.length === 1 ? "competitor" : "competitors"}
          </h2>
        </div>
        {competitors.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No competitors have been synced yet.
            </CardContent>
          </Card>
        ) : (
          <CompetitorSearch
            wcaId={competition.wcaId}
            competitors={competitors}
          />
        )}
      </section>
    </div>
  );
}
