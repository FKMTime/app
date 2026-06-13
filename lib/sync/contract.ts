import { z } from "zod";

// The sync contract is the single source of truth for what an FKMTime
// instance can send to the central app. Both sides depend on this file —
// short term it's vendored from this repo into the FKMTime backend; medium
// term it gets extracted to a published `@fkmtime/sync-contract` package.
//
// All schemas are `.strict()` so unknown fields are rejected at the door.
// This is what enforces the "no scrambles ever leave the instance" rule:
// even if a future instance build accidentally adds a `scramble` field, the
// central API returns 400 before the row is written.

export const SYNC_CONTRACT_VERSION = "1" as const;

// ---------- enums (must match prisma) -------------------------------------

export const groupStatusSchema = z.enum(["UPCOMING", "ONGOING", "FINISHED"]);
export const assignmentRoleSchema = z.enum([
  "COMPETITOR",
  "JUDGE",
  "RUNNER",
  "SCRAMBLER",
]);
export const attemptTypeSchema = z.enum(["STANDARD", "EXTRA"]);
export const attemptStatusSchema = z.enum(["STANDARD", "EXTRA", "DNF", "DNS"]);
export const incidentKindSchema = z.enum(["NOTEWORTHY", "MANUAL", "WARNING"]);

// ---------- entities ------------------------------------------------------

// Every entity carries an instance-side stable id and an instance-side
// updatedAt so the server can reject stale out-of-order writes.
const baseEntity = {
  instanceId: z.string().min(1).max(128),
  updatedAt: z.coerce.date(),
};

export const personSchema = z
  .object({
    ...baseEntity,
    registrantId: z.number().int().positive(),
    name: z.string().min(1).max(255),
    wcaUserId: z.number().int().positive().nullable(),
    wcaId: z.string().regex(/^\d{4}[A-Z]{4}\d{2}$/).nullable(),
    countryIso2: z.string().length(2).nullable(),
    gender: z.string().max(8).nullable(),
  })
  .strict();

export const groupSchema = z
  .object({
    ...baseEntity,
    activityCode: z.string().min(1).max(64),
    name: z.string().min(1).max(128),
    roomName: z.string().max(128).nullable(),
    roomColor: z.string().max(32).nullable(),
    status: groupStatusSchema,
    startTime: z.coerce.date().nullable(),
    endTime: z.coerce.date().nullable(),
  })
  .strict();

export const assignmentSchema = z
  .object({
    ...baseEntity,
    personInstanceId: z.string().min(1).max(128),
    groupInstanceId: z.string().min(1).max(128),
    role: assignmentRoleSchema,
  })
  .strict();

export const resultSchema = z
  .object({
    ...baseEntity,
    personInstanceId: z.string().min(1).max(128),
    eventId: z.string().min(1).max(32),
    roundId: z.string().min(1).max(64),
  })
  .strict();

export const attemptSchema = z
  .object({
    ...baseEntity,
    resultInstanceId: z.string().min(1).max(128),
    attemptNumber: z.number().int().min(1).max(20),
    value: z.number().int(),
    penalty: z.number().int().min(0).max(60 * 60 * 100),
    type: attemptTypeSchema,
    replacedBy: z.number().int().nullable(),
    status: attemptStatusSchema,
    description: z.string().max(2000).nullable(),
  })
  .strict();

export const incidentSchema = z
  .object({
    ...baseEntity,
    kind: incidentKindSchema,
    description: z.string().min(1).max(4000),
    personInstanceId: z.string().min(1).max(128).nullable(),
    attemptInstanceId: z.string().min(1).max(128).nullable(),
  })
  .strict();

export type PersonPayload = z.infer<typeof personSchema>;
export type GroupPayload = z.infer<typeof groupSchema>;
export type AssignmentPayload = z.infer<typeof assignmentSchema>;
export type ResultPayload = z.infer<typeof resultSchema>;
export type AttemptPayload = z.infer<typeof attemptSchema>;
export type IncidentPayload = z.infer<typeof incidentSchema>;

// ---------- envelope ------------------------------------------------------

const metaSchema = z
  .object({
    version: z.literal(SYNC_CONTRACT_VERSION),
    sentAt: z.coerce.date(),
    instanceVersion: z.string().max(64),
  })
  .strict();

// Delta = "these entities changed". Server upserts each; rows missing from
// the payload are NOT touched.
export const deltaPayloadSchema = z
  .object({
    meta: metaSchema,
    persons: z.array(personSchema).default([]),
    groups: z.array(groupSchema).default([]),
    assignments: z.array(assignmentSchema).default([]),
    results: z.array(resultSchema).default([]),
    attempts: z.array(attemptSchema).default([]),
    incidents: z.array(incidentSchema).default([]),
  })
  .strict();

// State = "this is the complete current snapshot". Server upserts every
// row AND deletes any row not present in the payload (scoped to this comp).
export const statePayloadSchema = deltaPayloadSchema;

export type DeltaPayload = z.infer<typeof deltaPayloadSchema>;
export type StatePayload = z.infer<typeof statePayloadSchema>;

export type EntityScope =
  | "persons"
  | "groups"
  | "assignments"
  | "results"
  | "attempts"
  | "incidents";

export const ALL_SCOPES: readonly EntityScope[] = [
  "persons",
  "groups",
  "assignments",
  "results",
  "attempts",
  "incidents",
] as const;
