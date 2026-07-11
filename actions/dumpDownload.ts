"use server";

import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/prisma";
import { presignDownload } from "@/lib/r2";

type ActionOk = { ok: true; url: string; expiresAt: string };
type ActionErr = { ok: false; error: string };

export async function getDumpDownloadUrl(
  dumpId: string,
): Promise<ActionOk | ActionErr> {
  await requireAdmin();
  const dump = await prisma.dbDump.findUnique({
    where: { id: dumpId },
    select: { objectKey: true },
  });
  if (!dump) return { ok: false, error: "Dump not found" };
  try {
    const ttlSeconds = 15 * 60;
    const url = await presignDownload(dump.objectKey, ttlSeconds);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    return { ok: true, url, expiresAt };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
