import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/prisma";
import {
  ALL_SCOPES,
  type AssignmentPayload,
  type AttemptPayload,
  type DeltaPayload,
  type EntityScope,
  type GroupPayload,
  type IncidentPayload,
  type PersonPayload,
  type ResultPayload,
  type StatePayload,
} from "./contract";
import { syncEventBus } from "./events";

type Tx = Prisma.TransactionClient;

export type ReconcileResult = {
  changedScopes: EntityScope[];
  counts: Record<EntityScope, { upserts: number; deletes: number }>;
};

function emptyCounts(): ReconcileResult["counts"] {
  const out = {} as ReconcileResult["counts"];
  for (const s of ALL_SCOPES) out[s] = { upserts: 0, deletes: 0 };
  return out;
}

// Returns existing (id, sourceUpdatedAt) keyed by instanceId for the rows we
// might write. One query per entity rather than per row. The table is
// passed as `findMany(args)` so callers don't have to repeat the select.
type ExistingMap = Map<string, { id: string; sourceUpdatedAt: Date }>;

function intoMap(
  rows: { id: string; instanceId: string; sourceUpdatedAt: Date }[],
): ExistingMap {
  const out: ExistingMap = new Map();
  for (const r of rows) out.set(r.instanceId, { id: r.id, sourceUpdatedAt: r.sourceUpdatedAt });
  return out;
}

// "Should I overwrite the existing row with this payload?" — older or equal
// updatedAt loses (a heartbeat re-asserting yesterday's state must never
// stomp on a delta that arrived a minute ago).
function shouldWrite(
  existing: { sourceUpdatedAt: Date } | undefined,
  payloadUpdatedAt: Date,
): boolean {
  if (!existing) return true;
  return payloadUpdatedAt > existing.sourceUpdatedAt;
}

async function upsertPersons(
  tx: Tx,
  competitionId: string,
  rows: PersonPayload[],
): Promise<{ idByInstanceId: Map<string, string>; writes: number }> {
  const idByInstanceId = new Map<string, string>();
  let writes = 0;
  if (rows.length === 0) return { idByInstanceId, writes };

  const instanceIds = rows.map((r) => r.instanceId);
  const existing = intoMap(
    await tx.person.findMany({
      where: { competitionId, instanceId: { in: instanceIds } },
      select: { id: true, instanceId: true, sourceUpdatedAt: true },
    }),
  );

  for (const r of rows) {
    const prior = existing.get(r.instanceId);
    if (prior) idByInstanceId.set(r.instanceId, prior.id);
    if (!shouldWrite(prior, r.updatedAt)) continue;

    const data = {
      registrantId: r.registrantId,
      name: r.name,
      wcaUserId: r.wcaUserId,
      wcaId: r.wcaId,
      countryIso2: r.countryIso2,
      gender: r.gender,
      sourceUpdatedAt: r.updatedAt,
    };
    const row = await tx.person.upsert({
      where: { competitionId_instanceId: { competitionId, instanceId: r.instanceId } },
      create: { competitionId, instanceId: r.instanceId, ...data },
      update: data,
      select: { id: true },
    });
    idByInstanceId.set(r.instanceId, row.id);
    writes++;
  }
  return { idByInstanceId, writes };
}

async function upsertGroups(
  tx: Tx,
  competitionId: string,
  rows: GroupPayload[],
): Promise<{ idByInstanceId: Map<string, string>; writes: number }> {
  const idByInstanceId = new Map<string, string>();
  let writes = 0;
  if (rows.length === 0) return { idByInstanceId, writes };

  const instanceIds = rows.map((r) => r.instanceId);
  const existing = intoMap(
    await tx.group.findMany({
      where: { competitionId, instanceId: { in: instanceIds } },
      select: { id: true, instanceId: true, sourceUpdatedAt: true },
    }),
  );

  for (const r of rows) {
    const prior = existing.get(r.instanceId);
    if (prior) idByInstanceId.set(r.instanceId, prior.id);
    if (!shouldWrite(prior, r.updatedAt)) continue;

    const data = {
      activityCode: r.activityCode,
      name: r.name,
      roomName: r.roomName,
      roomColor: r.roomColor,
      status: r.status,
      startTime: r.startTime,
      endTime: r.endTime,
      sourceUpdatedAt: r.updatedAt,
    };
    const row = await tx.group.upsert({
      where: { competitionId_instanceId: { competitionId, instanceId: r.instanceId } },
      create: { competitionId, instanceId: r.instanceId, ...data },
      update: data,
      select: { id: true },
    });
    idByInstanceId.set(r.instanceId, row.id);
    writes++;
  }
  return { idByInstanceId, writes };
}

function rowsToIdMap(
  rows: { id: string; instanceId: string }[],
): Map<string, string> {
  return new Map(rows.map((r) => [r.instanceId, r.id]));
}

async function upsertAssignments(
  tx: Tx,
  competitionId: string,
  rows: AssignmentPayload[],
  personIds: Map<string, string>,
  groupIds: Map<string, string>,
): Promise<number> {
  if (rows.length === 0) return 0;

  const instanceIds = rows.map((r) => r.instanceId);
  const existing = intoMap(
    await tx.assignment.findMany({
      where: { competitionId, instanceId: { in: instanceIds } },
      select: { id: true, instanceId: true, sourceUpdatedAt: true },
    }),
  );

  let writes = 0;
  for (const r of rows) {
    const personId = personIds.get(r.personInstanceId);
    const groupId = groupIds.get(r.groupInstanceId);
    if (!personId || !groupId) {
      throw new SyncReferenceError(
        `Assignment ${r.instanceId} references unknown ` +
          (personId ? `groupInstanceId=${r.groupInstanceId}` : `personInstanceId=${r.personInstanceId}`),
      );
    }
    const prior = existing.get(r.instanceId);
    if (!shouldWrite(prior, r.updatedAt)) continue;

    const data = {
      personId,
      groupId,
      role: r.role,
      sourceUpdatedAt: r.updatedAt,
    };
    await tx.assignment.upsert({
      where: { competitionId_instanceId: { competitionId, instanceId: r.instanceId } },
      create: { competitionId, instanceId: r.instanceId, ...data },
      update: data,
    });
    writes++;
  }
  return writes;
}

async function upsertResults(
  tx: Tx,
  competitionId: string,
  rows: ResultPayload[],
  personIds: Map<string, string>,
): Promise<{ idByInstanceId: Map<string, string>; writes: number }> {
  const idByInstanceId = new Map<string, string>();
  let writes = 0;
  if (rows.length === 0) return { idByInstanceId, writes };

  const instanceIds = rows.map((r) => r.instanceId);
  const existing = intoMap(
    await tx.result.findMany({
      where: { competitionId, instanceId: { in: instanceIds } },
      select: { id: true, instanceId: true, sourceUpdatedAt: true },
    }),
  );

  for (const r of rows) {
    const personId = personIds.get(r.personInstanceId);
    if (!personId) {
      throw new SyncReferenceError(
        `Result ${r.instanceId} references unknown personInstanceId=${r.personInstanceId}`,
      );
    }
    const prior = existing.get(r.instanceId);
    if (prior) idByInstanceId.set(r.instanceId, prior.id);
    if (!shouldWrite(prior, r.updatedAt)) continue;

    const data = {
      personId,
      eventId: r.eventId,
      roundId: r.roundId,
      sourceUpdatedAt: r.updatedAt,
    };
    const row = await tx.result.upsert({
      where: { competitionId_instanceId: { competitionId, instanceId: r.instanceId } },
      create: { competitionId, instanceId: r.instanceId, ...data },
      update: data,
      select: { id: true },
    });
    idByInstanceId.set(r.instanceId, row.id);
    writes++;
  }
  return { idByInstanceId, writes };
}

async function upsertAttempts(
  tx: Tx,
  competitionId: string,
  rows: AttemptPayload[],
  resultIds: Map<string, string>,
): Promise<{ idByInstanceId: Map<string, string>; writes: number }> {
  const idByInstanceId = new Map<string, string>();
  let writes = 0;
  if (rows.length === 0) return { idByInstanceId, writes };

  const instanceIds = rows.map((r) => r.instanceId);
  const existing = intoMap(
    await tx.attempt.findMany({
      where: { competitionId, instanceId: { in: instanceIds } },
      select: { id: true, instanceId: true, sourceUpdatedAt: true },
    }),
  );

  for (const r of rows) {
    const resultId = resultIds.get(r.resultInstanceId);
    if (!resultId) {
      throw new SyncReferenceError(
        `Attempt ${r.instanceId} references unknown resultInstanceId=${r.resultInstanceId}`,
      );
    }
    const prior = existing.get(r.instanceId);
    if (prior) idByInstanceId.set(r.instanceId, prior.id);
    if (!shouldWrite(prior, r.updatedAt)) continue;

    const data = {
      resultId,
      attemptNumber: r.attemptNumber,
      value: r.value,
      penalty: r.penalty,
      type: r.type,
      replacedBy: r.replacedBy,
      status: r.status,
      description: r.description,
      sourceUpdatedAt: r.updatedAt,
    };
    const row = await tx.attempt.upsert({
      where: { competitionId_instanceId: { competitionId, instanceId: r.instanceId } },
      create: { competitionId, instanceId: r.instanceId, ...data },
      update: data,
      select: { id: true },
    });
    idByInstanceId.set(r.instanceId, row.id);
    writes++;
  }
  return { idByInstanceId, writes };
}

async function upsertIncidents(
  tx: Tx,
  competitionId: string,
  rows: IncidentPayload[],
  personIds: Map<string, string>,
  attemptIds: Map<string, string>,
): Promise<number> {
  if (rows.length === 0) return 0;

  const instanceIds = rows.map((r) => r.instanceId);
  const existing = intoMap(
    await tx.incident.findMany({
      where: { competitionId, instanceId: { in: instanceIds } },
      select: { id: true, instanceId: true, sourceUpdatedAt: true },
    }),
  );

  let writes = 0;
  for (const r of rows) {
    const personId = r.personInstanceId
      ? personIds.get(r.personInstanceId) ?? null
      : null;
    const attemptId = r.attemptInstanceId
      ? attemptIds.get(r.attemptInstanceId) ?? null
      : null;
    // Allow optional dangling references (the row was deleted on the
    // instance side); just store as null.

    const prior = existing.get(r.instanceId);
    if (!shouldWrite(prior, r.updatedAt)) continue;

    const data = {
      kind: r.kind,
      description: r.description,
      personId,
      attemptId,
      sourceUpdatedAt: r.updatedAt,
    };
    await tx.incident.upsert({
      where: { competitionId_instanceId: { competitionId, instanceId: r.instanceId } },
      create: { competitionId, instanceId: r.instanceId, ...data },
      update: data,
    });
    writes++;
  }
  return writes;
}

export class SyncReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncReferenceError";
  }
}

async function applyCommon(
  competitionId: string,
  payload: DeltaPayload,
  mode: "delta" | "state",
): Promise<ReconcileResult> {
  const counts = emptyCounts();
  const result = await prisma.$transaction(async (tx: Tx) => {
    // Parent entities first.
    const personRes = await upsertPersons(tx, competitionId, payload.persons);
    const groupRes = await upsertGroups(tx, competitionId, payload.groups);

    // Inner-tier entities can reference parents that didn't ship in this
    // batch but already exist in the DB — pull a complete map only if we
    // need it.
    const needsFullPersonMap =
      payload.assignments.length > 0 ||
      payload.results.length > 0 ||
      payload.incidents.length > 0;
    const personIds = needsFullPersonMap
      ? mergeMaps(
          rowsToIdMap(
            await tx.person.findMany({
              where: { competitionId },
              select: { id: true, instanceId: true },
            }),
          ),
          personRes.idByInstanceId,
        )
      : personRes.idByInstanceId;
    const groupIds = payload.assignments.length > 0
      ? mergeMaps(
          rowsToIdMap(
            await tx.group.findMany({
              where: { competitionId },
              select: { id: true, instanceId: true },
            }),
          ),
          groupRes.idByInstanceId,
        )
      : groupRes.idByInstanceId;

    const assignmentWrites = await upsertAssignments(
      tx,
      competitionId,
      payload.assignments,
      personIds,
      groupIds,
    );

    const resultRes = await upsertResults(
      tx,
      competitionId,
      payload.results,
      personIds,
    );

    const resultIds = payload.attempts.length > 0
      ? mergeMaps(
          rowsToIdMap(
            await tx.result.findMany({
              where: { competitionId },
              select: { id: true, instanceId: true },
            }),
          ),
          resultRes.idByInstanceId,
        )
      : resultRes.idByInstanceId;

    const attemptRes = await upsertAttempts(
      tx,
      competitionId,
      payload.attempts,
      resultIds,
    );

    const attemptIds = payload.incidents.length > 0
      ? mergeMaps(
          rowsToIdMap(
            await tx.attempt.findMany({
              where: { competitionId },
              select: { id: true, instanceId: true },
            }),
          ),
          attemptRes.idByInstanceId,
        )
      : attemptRes.idByInstanceId;

    const incidentWrites = await upsertIncidents(
      tx,
      competitionId,
      payload.incidents,
      personIds,
      attemptIds,
    );

    counts.persons.upserts = personRes.writes;
    counts.groups.upserts = groupRes.writes;
    counts.assignments.upserts = assignmentWrites;
    counts.results.upserts = resultRes.writes;
    counts.attempts.upserts = attemptRes.writes;
    counts.incidents.upserts = incidentWrites;

    if (mode === "state") {
      // Delete rows not present in payload, children first.
      const keep = (rows: { instanceId: string }[]) =>
        rows.map((r) => r.instanceId);
      counts.incidents.deletes = (
        await tx.incident.deleteMany({
          where: { competitionId, instanceId: { notIn: keep(payload.incidents) } },
        })
      ).count;
      counts.attempts.deletes = (
        await tx.attempt.deleteMany({
          where: { competitionId, instanceId: { notIn: keep(payload.attempts) } },
        })
      ).count;
      counts.results.deletes = (
        await tx.result.deleteMany({
          where: { competitionId, instanceId: { notIn: keep(payload.results) } },
        })
      ).count;
      counts.assignments.deletes = (
        await tx.assignment.deleteMany({
          where: { competitionId, instanceId: { notIn: keep(payload.assignments) } },
        })
      ).count;
      counts.groups.deletes = (
        await tx.group.deleteMany({
          where: { competitionId, instanceId: { notIn: keep(payload.groups) } },
        })
      ).count;
      counts.persons.deletes = (
        await tx.person.deleteMany({
          where: { competitionId, instanceId: { notIn: keep(payload.persons) } },
        })
      ).count;
    }

    return counts;
  });

  const changedScopes = ALL_SCOPES.filter(
    (s) => result[s].upserts > 0 || result[s].deletes > 0,
  );

  if (changedScopes.length > 0) {
    syncEventBus.emitChange({
      competitionId,
      scopes: changedScopes,
      at: new Date(),
    });
  }

  return { changedScopes, counts: result };
}

function mergeMaps(
  base: Map<string, string>,
  overlay: Map<string, string>,
): Map<string, string> {
  for (const [k, v] of overlay) base.set(k, v);
  return base;
}

export function applyDelta(
  competitionId: string,
  payload: DeltaPayload,
): Promise<ReconcileResult> {
  return applyCommon(competitionId, payload, "delta");
}

export function applyState(
  competitionId: string,
  payload: StatePayload,
): Promise<ReconcileResult> {
  return applyCommon(competitionId, payload, "state");
}

export async function updateSyncStatus(
  competitionId: string,
  payload: { instanceVersion: string; sentAt: Date; mode: "delta" | "state" },
): Promise<void> {
  const now = new Date();
  await prisma.syncStatus.upsert({
    where: { competitionId },
    create: {
      competitionId,
      instanceVersion: payload.instanceVersion,
      lastClientSentAt: payload.sentAt,
      lastDeltaAt: payload.mode === "delta" ? now : null,
      lastHeartbeatAt: payload.mode === "state" ? now : null,
    },
    update: {
      instanceVersion: payload.instanceVersion,
      lastClientSentAt: payload.sentAt,
      ...(payload.mode === "delta"
        ? { lastDeltaAt: now }
        : { lastHeartbeatAt: now }),
    },
  });
}

// Re-export the Prisma namespace barrel so callers can type their tx if
// they ever inline a transaction. (Unused today but keeps the surface
// honest if we extract this module.)
export type { Prisma };
