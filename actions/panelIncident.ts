"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { IncidentKind } from "@prisma/client";
import { prisma } from "@/prisma";
import { requireDelegateAccess } from "@/lib/authz/panel";

type Result = { ok: true } | { ok: false; error: string };

export async function createManualIncident(
  wcaId: string,
  input: {
    kind: IncidentKind;
    description: string;
    personId?: string | null;
  },
): Promise<Result> {
  const access = await requireDelegateAccess(wcaId);

  const description = input.description.trim();
  if (!description) return { ok: false, error: "Description is required" };
  if (description.length > 4000) {
    return { ok: false, error: "Description is too long" };
  }

  // Personne-IDs from the picker are scoped to this comp anyway, but
  // re-check to be safe.
  let personId: string | null = null;
  if (input.personId) {
    const p = await prisma.person.findFirst({
      where: { id: input.personId, competitionId: access.competition.id },
      select: { id: true },
    });
    if (!p) return { ok: false, error: "Unknown person" };
    personId = p.id;
  }

  const now = new Date();
  // Manual rows still need a unique instanceId (the column is non-nullable).
  // Prefix sets it apart from anything an instance might send.
  const instanceId = `mnl-${randomBytes(8).toString("hex")}`;

  await prisma.incident.create({
    data: {
      competitionId: access.competition.id,
      instanceId,
      source: "MANUAL",
      kind: input.kind,
      description,
      personId,
      createdById: access.userId,
      sourceUpdatedAt: now,
    },
  });

  revalidatePath(`/panel/${wcaId}/incidents`);
  return { ok: true };
}

export async function deleteManualIncident(
  wcaId: string,
  incidentId: string,
): Promise<Result> {
  const access = await requireDelegateAccess(wcaId);
  const inc = await prisma.incident.findFirst({
    where: { id: incidentId, competitionId: access.competition.id },
    select: { id: true, source: true },
  });
  if (!inc) return { ok: false, error: "Incident not found" };
  if (inc.source !== "MANUAL") {
    return {
      ok: false,
      error: "Sync-sourced incidents can only be deleted from the instance",
    };
  }
  await prisma.incident.delete({ where: { id: incidentId } });
  revalidatePath(`/panel/${wcaId}/incidents`);
  return { ok: true };
}
