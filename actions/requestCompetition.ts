"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/prisma";
import {
  getWcaAccessToken,
  upcomingManageableCompetitions,
} from "@/lib/wca";

type ActionResult =
  | { ok: true; competitionId: string }
  | { ok: false; error: string };

export async function requestCompetition(
  wcaCompId: string,
  notes?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in" };

  // Server-side verification: the requester must actually manage this comp on
  // WCA. We trust no input — re-fetch managed_by_me and look up the comp.
  const token = await getWcaAccessToken(session.user.id);
  const managed = await upcomingManageableCompetitions(token);
  const wcaComp = managed.find((c) => c.id === wcaCompId);
  if (!wcaComp) {
    return {
      ok: false,
      error: "You do not appear to manage this competition on WCA",
    };
  }

  const existing = await prisma.competition.findUnique({
    where: { wcaId: wcaCompId },
  });

  if (existing) {
    if (existing.status === "REJECTED") {
      await prisma.competition.update({
        where: { id: existing.id },
        data: {
          status: "REQUESTED",
          requestNotes: notes || null,
          rejectionReason: null,
          rejectedAt: null,
          requestedById: session.user.id,
          requestedAt: new Date(),
        },
      });
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/competitions");
      revalidatePath("/admin/requests");
      return { ok: true, competitionId: existing.id };
    }
    return {
      ok: false,
      error: `A request for this competition already exists (status: ${existing.status})`,
    };
  }

  const created = await prisma.competition.create({
    data: {
      wcaId: wcaCompId,
      name: wcaComp.name,
      shortName: wcaComp.short_name ?? null,
      startDate: new Date(wcaComp.start_date),
      endDate: new Date(wcaComp.end_date),
      status: "REQUESTED",
      requestNotes: notes || null,
      requestedById: session.user.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/competitions");
  revalidatePath("/admin/requests");
  return { ok: true, competitionId: created.id };
}
