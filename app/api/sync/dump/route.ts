import { NextResponse } from "next/server";
import { authenticateSyncRequest } from "@/lib/sync/auth";
import { prisma } from "@/prisma";
import { uploadObject } from "@/lib/r2";

export const runtime = "nodejs";

// Cap on total upload size — a comp's DB is O(few MB) but pg_dump of the
// central-app slice for one comp includes all rows, so give plenty of room.
const MAX_BODY_BYTES = 500 * 1024 * 1024; // 500 MiB

// Instance-side flow at end-of-comp:
//   POST /api/sync/dump
//     Authorization: Bearer fkm_...
//     Content-Type: application/gzip
//     body: gzipped pg_dump output
//
// Server: stores the object in R2 under
//   dumps/<wcaCompId>/<iso-timestamp>.sql.gz
// records DbDump, flips competition to FINISHED, and returns { ok, dumpId }.
//
// This is idempotent-safe: uploading twice creates two DbDump rows (an admin
// can inspect and pick the newest), but the FINISHED transition happens once.
export async function POST(req: Request) {
  const auth = await authenticateSyncRequest(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const lenHeader = req.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const contentType = req.headers.get("content-type") ?? "application/gzip";

  const arrayBuffer = await req.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  if (arrayBuffer.byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const comp = await prisma.competition.findUnique({
    where: { id: auth.competitionId },
    select: { id: true, wcaId: true, endDate: true, status: true },
  });
  if (!comp) return NextResponse.json({ error: "Competition not found" }, { status: 404 });

  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  const objectKey = `dumps/${comp.wcaId}/${iso}.sql.gz`;

  let uploaded;
  try {
    uploaded = await uploadObject(objectKey, Buffer.from(arrayBuffer), contentType);
  } catch (e) {
    console.error("[sync/dump] R2 upload failed:", e);
    return NextResponse.json(
      { error: `R2 upload failed: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  const dump = await prisma.dbDump.create({
    data: {
      competitionId: comp.id,
      objectKey: uploaded.key,
      sizeBytes: BigInt(uploaded.sizeBytes),
    },
    select: { id: true },
  });

  // Flip to FINISHED and revoke live API keys. If already FINISHED, this is
  // a no-op (dump ingestion still succeeded).
  if (comp.status !== "FINISHED") {
    await prisma.$transaction([
      prisma.competition.update({
        where: { id: comp.id },
        data: { status: "FINISHED" },
      }),
      prisma.apiKey.updateMany({
        where: { competitionId: comp.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  return NextResponse.json({
    ok: true,
    dumpId: dump.id,
    objectKey: uploaded.key,
    sizeBytes: uploaded.sizeBytes,
  });
}
