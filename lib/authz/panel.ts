import "server-only";

import { notFound, redirect } from "next/navigation";
import type { Competition } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/prisma";

export type PanelAccess = {
  userId: string;
  competition: Competition;
  isAdmin: boolean;
  isDelegate: boolean;
  isOrganizer: boolean;
  // Admins get every delegate affordance — no separate "admin role" plumbing
  // throughout the panel UI.
  hasDelegateAccess: boolean;
};

async function loadPanelAccess(
  wcaId: string,
): Promise<PanelAccess | { redirect: string } | { notFound: true }> {
  const session = await auth();
  if (!session?.user?.id) return { redirect: "/" };

  const competition = await prisma.competition.findUnique({
    where: { wcaId },
  });
  if (!competition) return { notFound: true };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true },
  });
  if (!user) return { redirect: "/" };

  const roles = await prisma.competitionRole.findMany({
    where: { userId: user.id, competitionId: competition.id },
    select: { role: true },
  });
  const isDelegate = roles.some((r) => r.role === "DELEGATE");
  const isOrganizer = roles.some((r) => r.role === "ORGANIZER");

  if (!user.isAdmin && !isDelegate && !isOrganizer) {
    return { redirect: "/dashboard" };
  }

  return {
    userId: user.id,
    competition,
    isAdmin: user.isAdmin,
    isDelegate,
    isOrganizer,
    hasDelegateAccess: user.isAdmin || isDelegate,
  };
}

export async function requirePanelAccess(wcaId: string): Promise<PanelAccess> {
  const result = await loadPanelAccess(wcaId);
  if ("notFound" in result) notFound();
  if ("redirect" in result) redirect(result.redirect);
  return result;
}

export async function requireDelegateAccess(wcaId: string): Promise<PanelAccess> {
  const access = await requirePanelAccess(wcaId);
  if (!access.hasDelegateAccess) redirect(`/panel/${wcaId}`);
  return access;
}

export async function requirePostCompDelegateAccess(
  wcaId: string,
): Promise<PanelAccess> {
  const access = await requireDelegateAccess(wcaId);
  if (access.competition.status !== "FINISHED") {
    redirect(`/panel/${wcaId}`);
  }
  return access;
}
