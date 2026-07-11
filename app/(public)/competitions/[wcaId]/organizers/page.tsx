import { notFound } from "next/navigation";
import { ExternalLink, Gavel, ShieldCheck, Sparkles, User } from "lucide-react";
import type { CompetitionRoleKind } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  getPublicCompetitionByWcaId,
  getPublicCompetitionRoles,
} from "@/lib/data/public";
import { CompetitionHeader } from "@/components/public/competition-header";
import { WCA_ORIGIN } from "@/lib/constants";

// Public "who's running this competition" page. Sourced from CompetitionRole
// rows synced from WCIF (see lib/wcaRoles.ts). Grouped by kind:
//   Delegates first — they are the WCA's on-site authority
//   Organizers second — the local team responsible for logistics
// A "manual" badge appears on rows added by admin override so the audience
// can see who is/isn't officially in WCIF.

const KIND_META: Record<
  CompetitionRoleKind,
  { label: string; description: string; Icon: typeof User }
> = {
  DELEGATE: {
    label: "Delegates",
    description:
      "WCA delegates certify results and enforce regulations at the venue. Reach out to a delegate for anything rules-related.",
    Icon: Gavel,
  },
  ORGANIZER: {
    label: "Organizers",
    description:
      "The local team running the day-to-day — schedule, venue, registrations, and volunteer coordination.",
    Icon: ShieldCheck,
  },
};

export default async function OrganizersPage({
  params,
}: {
  params: Promise<{ wcaId: string }>;
}) {
  const { wcaId } = await params;
  const competition = await getPublicCompetitionByWcaId(wcaId);
  if (!competition) notFound();

  const roles = await getPublicCompetitionRoles(competition.id);

  const grouped: Record<CompetitionRoleKind, typeof roles> = {
    DELEGATE: roles.filter((r) => r.role === "DELEGATE"),
    ORGANIZER: roles.filter((r) => r.role === "ORGANIZER"),
  };

  return (
    <div className="space-y-6">
      <CompetitionHeader competition={competition} active="team" />

      <p className="text-sm text-muted-foreground">
        Team information is synced from the official WCA competition record.
        Roles you see here are what the WCA has listed for this competition.
      </p>

      {roles.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            The organizing team hasn&apos;t been synced from WCA yet. It usually
            appears shortly after the competition is provisioned.
          </CardContent>
        </Card>
      ) : (
        <>
          {(["DELEGATE", "ORGANIZER"] as const).map((kind) => {
            const entries = grouped[kind];
            if (entries.length === 0) return null;
            const meta = KIND_META[kind];
            return (
              <section
                key={kind}
                className="space-y-3"
                aria-labelledby={`${kind}-heading`}
              >
                <div className="flex items-center gap-2">
                  <meta.Icon
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                  <h2
                    id={`${kind}-heading`}
                    className="text-base font-semibold"
                  >
                    {meta.label} ({entries.length})
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {meta.description}
                </p>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {entries.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 rounded-md border bg-card p-3"
                    >
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <User className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {r.user.name ?? "Unknown"}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {r.user.wcaId ? (
                            <a
                              href={`${WCA_ORIGIN}/persons/${encodeURIComponent(
                                r.user.wcaId,
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 hover:underline"
                            >
                              {r.user.wcaId}
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          ) : (
                            <span>newcomer</span>
                          )}
                        </div>
                      </div>
                      {r.source === "MANUAL" && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                          title="Added manually by an admin, not from WCA"
                        >
                          <Sparkles className="h-3 w-3" aria-hidden />
                          manual
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
