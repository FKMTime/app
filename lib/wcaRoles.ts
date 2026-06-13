import "server-only";

import type { CompetitionRoleKind } from "@prisma/client";
import { prisma } from "@/prisma";
import { WCA_ORIGIN } from "./constants";

type WcifPerson = {
  // WCA user id (numeric)
  wcaUserId: number;
  // Public WCA id like "2018DOEJ01", null for newcomers
  wcaId: string | null;
  name: string;
  // WCIF roles: "delegate", "trainee-delegate", "organizer", "staff-*", ...
  roles?: string[];
};

type WcifPublic = {
  id: string;
  name: string;
  persons: WcifPerson[];
};

function mapWcifRoles(roles: string[] | undefined): CompetitionRoleKind[] {
  if (!roles) return [];
  const out = new Set<CompetitionRoleKind>();
  for (const r of roles) {
    if (r === "organizer") out.add("ORGANIZER");
    else if (r === "delegate" || r === "trainee-delegate") out.add("DELEGATE");
  }
  return [...out];
}

export async function fetchWcifPublic(wcaCompId: string): Promise<WcifPublic> {
  const res = await fetch(
    `${WCA_ORIGIN}/api/v0/competitions/${encodeURIComponent(wcaCompId)}/wcif/public`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `WCIF fetch failed for ${wcaCompId}: ${res.status} ${body}`,
    );
  }
  return (await res.json()) as WcifPublic;
}

export type SyncWcaRolesResult = {
  scanned: number;
  matched: number;
  created: number;
  removed: number;
};

// Pulls WCIF persons for the competition, maps "delegate"/"organizer" roles to
// our enum, and reconciles the CompetitionRole rows whose source == WCA. Roles
// for users we don't have a row for yet are skipped (they'll be picked up at
// the user's next sign-in via signOnUserRoleCatchup — TODO).
export async function syncWcaRolesForCompetition(
  competitionId: string,
  wcaCompId: string,
): Promise<SyncWcaRolesResult> {
  const wcif = await fetchWcifPublic(wcaCompId);

  // Build the desired set of (userId, role) pairs based on WCIF.
  const wcaUserIds = new Set<number>();
  const desired: { wcaUserId: number; role: CompetitionRoleKind }[] = [];
  for (const p of wcif.persons) {
    const roles = mapWcifRoles(p.roles);
    if (roles.length === 0) continue;
    wcaUserIds.add(p.wcaUserId);
    for (const role of roles) desired.push({ wcaUserId: p.wcaUserId, role });
  }

  // Find our local users that correspond to those WCA user ids.
  const users = await prisma.user.findMany({
    where: { wcaUserId: { in: [...wcaUserIds] } },
    select: { id: true, wcaUserId: true },
  });
  const byWcaUserId = new Map(users.map((u) => [u.wcaUserId!, u.id]));

  const desiredRows = desired
    .map((d) => {
      const userId = byWcaUserId.get(d.wcaUserId);
      return userId ? { userId, role: d.role } : null;
    })
    .filter((r): r is { userId: string; role: CompetitionRoleKind } => r !== null);

  const existing = await prisma.competitionRole.findMany({
    where: { competitionId, source: "WCA" },
    select: { id: true, userId: true, role: true },
  });

  const desiredKeys = new Set(desiredRows.map((r) => `${r.userId}:${r.role}`));
  const existingKeys = new Set(existing.map((e) => `${e.userId}:${e.role}`));
  const toCreate = desiredRows.filter((r) => !existingKeys.has(`${r.userId}:${r.role}`));
  const toRemove = existing.filter((e) => !desiredKeys.has(`${e.userId}:${e.role}`));

  await prisma.$transaction([
    ...toCreate.map((r) =>
      prisma.competitionRole.create({
        data: {
          competitionId,
          userId: r.userId,
          role: r.role,
          source: "WCA",
        },
      }),
    ),
    ...(toRemove.length > 0
      ? [
          prisma.competitionRole.deleteMany({
            where: { id: { in: toRemove.map((r) => r.id) } },
          }),
        ]
      : []),
  ]);

  return {
    scanned: wcif.persons.length,
    matched: desiredRows.length,
    created: toCreate.length,
    removed: toRemove.length,
  };
}
