import { NextResponse } from "next/server";
import { authenticateSyncRequest } from "@/lib/sync/auth";
import { statePayloadSchema } from "@/lib/sync/contract";
import {
  applyState,
  SyncReferenceError,
  updateSyncStatus,
} from "@/lib/sync/reconcile";

export const runtime = "nodejs";
// Full snapshots are larger than deltas but still bounded by competition
// size (a few hundred KB of JSON in the design doc); cap generously.
const MAX_BODY_BYTES = 20 * 1024 * 1024;

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

  const parsed = statePayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Schema validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await applyState(auth.competitionId, parsed.data);
    await updateSyncStatus(auth.competitionId, {
      instanceVersion: parsed.data.meta.instanceVersion,
      sentAt: parsed.data.meta.sentAt,
      mode: "state",
    });
    return NextResponse.json({
      ok: true,
      mode: "state",
      changedScopes: result.changedScopes,
      counts: result.counts,
    });
  } catch (e) {
    if (e instanceof SyncReferenceError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("[sync/state]", e);
    return NextResponse.json(
      { error: "Internal error applying state" },
      { status: 500 },
    );
  }
}
