"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { requireAdmin, isAdminUser } from "@/lib/authz";
import {
  decryptSecret,
  encryptSecret,
  generateApiKey,
} from "@/lib/crypto";
import { getFkmProxyClient } from "@/lib/fkmProxy";
import { syncWcaRolesForCompetition } from "@/lib/wcaRoles";

const API_KEY_TTL_DAYS = Number(process.env.API_KEY_TTL_DAYS ?? 7);
const PENDING_REVEAL_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type ActionOk<T> = { ok: true } & T;
type ActionErr = { ok: false; error: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

function revalidateAll(competitionId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/competitions");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/competitions/${competitionId}`);
}

type AccessCheck =
  | { userId: string; comp: { id: string; requestedById: string } }
  | { error: string };

async function ensureRequesterOrAdmin(competitionId: string): Promise<AccessCheck> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };
  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true, requestedById: true },
  });
  if (!comp) return { error: "Competition not found" };
  if (comp.requestedById === session.user.id) return { userId: session.user.id, comp };
  if (await isAdminUser(session.user.id)) return { userId: session.user.id, comp };
  return { error: "Forbidden" };
}

export async function approveCompetition(
  competitionId: string,
): Promise<ActionResult<{ plaintextKey: string }>> {
  const { userId: adminId } = await requireAdmin();

  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
  });
  if (!comp) return { ok: false, error: "Competition not found" };
  if (comp.status !== "REQUESTED") {
    return { ok: false, error: `Cannot approve a ${comp.status} competition` };
  }

  // Provision the fkm-proxy tunnel. If this fails, nothing in our DB changes —
  // the admin can retry the approval.
  let tunnel;
  try {
    const proxy = getFkmProxyClient();
    tunnel = await proxy.createTunnel({ wcaId: comp.wcaId, label: comp.name });
  } catch (e) {
    return {
      ok: false,
      error: `Proxy tunnel creation failed: ${(e as Error).message}`,
    };
  }

  const apiKey = generateApiKey();
  const expiresAt = new Date(
    comp.endDate.getTime() + API_KEY_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  const proxySecretEnc = encryptSecret(tunnel.secret);
  const pendingApiKeyEnc = encryptSecret(apiKey.plaintext);

  await prisma.$transaction([
    prisma.competition.update({
      where: { id: comp.id },
      data: {
        status: "APPROVED",
        approvedById: adminId,
        approvedAt: new Date(),
        proxyTunnelUrl: tunnel.tunnelUrl,
        proxySecretEnc,
        pendingApiKeyEnc,
        pendingApiKeyExpiresAt: new Date(Date.now() + PENDING_REVEAL_TTL_MS),
      },
    }),
    prisma.apiKey.create({
      data: {
        competitionId: comp.id,
        keyHash: apiKey.hash,
        lastFour: apiKey.lastFour,
        expiresAt,
      },
    }),
  ]);

  // Best-effort WCA role sync; failure here shouldn't block approval.
  try {
    await syncWcaRolesForCompetition(comp.id, comp.wcaId);
  } catch (e) {
    console.error("[approveCompetition] role sync failed:", e);
  }

  revalidateAll(comp.id);
  return { ok: true, plaintextKey: apiKey.plaintext };
}

export async function rejectCompetition(
  competitionId: string,
  reason: string,
): Promise<ActionResult<{}>> {
  await requireAdmin();
  if (!reason.trim()) return { ok: false, error: "Reason is required" };
  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) return { ok: false, error: "Competition not found" };
  if (comp.status !== "REQUESTED") {
    return { ok: false, error: `Cannot reject a ${comp.status} competition` };
  }
  await prisma.competition.update({
    where: { id: competitionId },
    data: {
      status: "REJECTED",
      rejectionReason: reason.trim(),
      rejectedAt: new Date(),
    },
  });
  revalidateAll(competitionId);
  return { ok: true };
}

export async function regenerateApiKey(
  competitionId: string,
): Promise<ActionResult<{ plaintextKey: string }>> {
  await requireAdmin();
  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) return { ok: false, error: "Competition not found" };
  if (comp.status === "REQUESTED" || comp.status === "REJECTED") {
    return {
      ok: false,
      error: "Cannot mint API keys for an un-approved competition",
    };
  }

  const apiKey = generateApiKey();
  const expiresAt = new Date(
    comp.endDate.getTime() + API_KEY_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  const pendingApiKeyEnc = encryptSecret(apiKey.plaintext);

  await prisma.$transaction([
    prisma.apiKey.updateMany({
      where: { competitionId: comp.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.apiKey.create({
      data: {
        competitionId: comp.id,
        keyHash: apiKey.hash,
        lastFour: apiKey.lastFour,
        expiresAt,
      },
    }),
    prisma.competition.update({
      where: { id: comp.id },
      data: {
        pendingApiKeyEnc,
        pendingApiKeyExpiresAt: new Date(Date.now() + PENDING_REVEAL_TTL_MS),
      },
    }),
  ]);

  revalidateAll(comp.id);
  return { ok: true, plaintextKey: apiKey.plaintext };
}

export async function revokeApiKey(
  apiKeyId: string,
): Promise<ActionResult<{}>> {
  await requireAdmin();
  const key = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { id: true, competitionId: true, revokedAt: true },
  });
  if (!key) return { ok: false, error: "Key not found" };
  if (key.revokedAt) return { ok: false, error: "Key already revoked" };
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { revokedAt: new Date() },
  });
  revalidateAll(key.competitionId);
  return { ok: true };
}

export async function revealApiKey(
  competitionId: string,
): Promise<ActionResult<{ plaintextKey: string }>> {
  const check = await ensureRequesterOrAdmin(competitionId);
  if ("error" in check) return { ok: false, error: check.error };

  // Atomic read+clear: updateMany only matches while the pending payload is
  // still present and unexpired, so two concurrent reveals can't both succeed.
  const now = new Date();
  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { pendingApiKeyEnc: true, pendingApiKeyExpiresAt: true },
  });
  if (!comp?.pendingApiKeyEnc) {
    return { ok: false, error: "No pending API key to reveal" };
  }
  if (comp.pendingApiKeyExpiresAt && comp.pendingApiKeyExpiresAt < now) {
    return { ok: false, error: "The reveal window for this key has expired" };
  }

  const cleared = await prisma.competition.updateMany({
    where: {
      id: competitionId,
      pendingApiKeyEnc: comp.pendingApiKeyEnc,
    },
    data: {
      pendingApiKeyEnc: null,
      pendingApiKeyExpiresAt: null,
    },
  });
  if (cleared.count === 0) {
    return { ok: false, error: "Reveal was consumed by another request" };
  }

  const plaintextKey = decryptSecret(comp.pendingApiKeyEnc);
  revalidateAll(competitionId);
  return { ok: true, plaintextKey };
}

export async function revealProxySecret(
  competitionId: string,
): Promise<ActionResult<{ tunnelUrl: string | null; secret: string }>> {
  const check = await ensureRequesterOrAdmin(competitionId);
  if ("error" in check) return { ok: false, error: check.error };

  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { proxyTunnelUrl: true, proxySecretEnc: true },
  });
  if (!comp?.proxySecretEnc) {
    return { ok: false, error: "Proxy tunnel has not been provisioned yet" };
  }
  return {
    ok: true,
    tunnelUrl: comp.proxyTunnelUrl,
    secret: decryptSecret(comp.proxySecretEnc),
  };
}
