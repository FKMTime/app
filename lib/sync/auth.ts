import "server-only";

import { prisma } from "@/prisma";
import { hashApiKey } from "@/lib/crypto";

export type SyncAuth =
  | { ok: true; competitionId: string; apiKeyId: string }
  | { ok: false; status: 401 | 403; error: string };

const BEARER_PREFIX = "Bearer ";

export async function authenticateSyncRequest(
  authorization: string | null,
): Promise<SyncAuth> {
  if (!authorization || !authorization.startsWith(BEARER_PREFIX)) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const token = authorization.slice(BEARER_PREFIX.length).trim();
  if (!token.startsWith("fkm_")) {
    return { ok: false, status: 401, error: "Malformed token" };
  }

  const keyHash = hashApiKey(token);
  const key = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      competitionId: true,
      expiresAt: true,
      revokedAt: true,
      competition: { select: { status: true } },
    },
  });
  if (!key) return { ok: false, status: 401, error: "Unknown token" };
  if (key.revokedAt) return { ok: false, status: 403, error: "Token revoked" };
  if (key.expiresAt < new Date()) {
    return { ok: false, status: 403, error: "Token expired" };
  }
  if (key.competition.status === "FINISHED") {
    return {
      ok: false,
      status: 403,
      error: "Competition is FINISHED — sync writes are rejected",
    };
  }

  // Bump lastUsedAt (best-effort, can't fail the request).
  prisma.apiKey
    .update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((e) => console.error("[sync auth] lastUsedAt bump failed:", e));

  return { ok: true, competitionId: key.competitionId, apiKeyId: key.id };
}
