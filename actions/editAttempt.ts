"use server";

import { revalidatePath } from "next/cache";
import type { AttemptStatus } from "@prisma/client";
import { prisma } from "@/prisma";
import { requirePostCompDelegateAccess } from "@/lib/authz/panel";

type Result = { ok: true } | { ok: false; error: string };

const ALLOWED_STATUSES: AttemptStatus[] = ["STANDARD", "EXTRA", "DNF", "DNS"];
const ALLOWED_PENALTIES = new Set([0, 200]);

export async function editAttempt(
  wcaId: string,
  attemptId: string,
  input: {
    value: number;
    penalty: number;
    status: AttemptStatus;
    description: string | null;
  },
): Promise<Result> {
  const access = await requirePostCompDelegateAccess(wcaId);

  if (!ALLOWED_STATUSES.includes(input.status)) {
    return { ok: false, error: "Invalid attempt status" };
  }
  if (!ALLOWED_PENALTIES.has(input.penalty)) {
    return { ok: false, error: "Penalty must be 0 or +2 (200 centiseconds)" };
  }
  if (!Number.isInteger(input.value) || input.value < 0) {
    return { ok: false, error: "Value must be a non-negative integer (centiseconds)" };
  }
  if (input.description !== null && input.description.length > 2000) {
    return { ok: false, error: "Description is too long" };
  }

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, competitionId: access.competition.id },
    select: { id: true },
  });
  if (!attempt) return { ok: false, error: "Attempt not found" };

  // DNF/DNS by convention store value 0 on the central side; clearer than
  // keeping the previous timed value around.
  const value = input.status === "DNF" || input.status === "DNS" ? 0 : input.value;
  const penalty = input.status === "DNF" || input.status === "DNS" ? 0 : input.penalty;

  const now = new Date();
  await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      value,
      penalty,
      status: input.status,
      description: input.description?.trim() || null,
      editedById: access.userId,
      editedAt: now,
      sourceUpdatedAt: now,
    },
  });

  revalidatePath(`/panel/${wcaId}/edit`);
  revalidatePath(`/panel/${wcaId}/results`);
  return { ok: true };
}
