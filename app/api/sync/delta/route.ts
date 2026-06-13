import { NextResponse } from "next/server";
import { authenticateSyncRequest } from "@/lib/sync/auth";
import { deltaPayloadSchema } from "@/lib/sync/contract";
import {
  applyDelta,
  SyncReferenceError,
  updateSyncStatus,
} from "@/lib/sync/reconcile";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MiB cap; deltas are tiny

export async function POST(req: Request) {
  const auth = await authenticateSyncRequest(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const lenHeader = req.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large" },
      { status: 413 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deltaPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Schema validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await applyDelta(auth.competitionId, parsed.data);
    await updateSyncStatus(auth.competitionId, {
      instanceVersion: parsed.data.meta.instanceVersion,
      sentAt: parsed.data.meta.sentAt,
      mode: "delta",
    });
    return NextResponse.json({
      ok: true,
      mode: "delta",
      changedScopes: result.changedScopes,
      counts: result.counts,
    });
  } catch (e) {
    if (e instanceof SyncReferenceError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("[sync/delta]", e);
    return NextResponse.json(
      { error: "Internal error applying delta" },
      { status: 500 },
    );
  }
}
