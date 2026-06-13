import "server-only";

import { prisma } from "@/prisma";

// Panel data layer.
//
// Two flavours of result/round queries:
//   - ORGANIZER selects mirror the public layer (NO description, NO
//     incidents) — organizers don't get delegate-only fields.
//   - DELEGATE selects add Attempt.description and pull related incidents.
//
// Keep these as the only read paths from panel pages so a future change
// can't accidentally widen the organizer view.

const PERSON_SELECT = {
  id: true,
  registrantId: true,
  name: true,
  wcaId: true,
  countryIso2: true,
  gender: true,
} as const;

const ATTEMPT_ORG_SELECT = {
  id: true,
  attemptNumber: true,
  value: true,
  penalty: true,
  type: true,
  replacedBy: true,
  status: true,
} as const;

const ATTEMPT_DELEGATE_SELECT = {
  ...ATTEMPT_ORG_SELECT,
  description: true,
  editedAt: true,
  editedBy: { select: { id: true, name: true } },
} as const;

export async function getPanelRoundsList(competitionId: string) {
  return prisma.result.findMany({
    where: { competitionId },
    distinct: ["eventId", "roundId"],
    orderBy: [{ eventId: "asc" }, { roundId: "asc" }],
    select: { eventId: true, roundId: true },
  });
}

export async function getOrganizerRoundResults(
  competitionId: string,
  roundId: string,
) {
  return prisma.result.findMany({
    where: { competitionId, roundId },
    select: {
      id: true,
      eventId: true,
      roundId: true,
      person: { select: PERSON_SELECT },
      attempts: {
        orderBy: { attemptNumber: "asc" },
        select: ATTEMPT_ORG_SELECT,
      },
    },
  });
}

export async function getDelegateRoundResults(
  competitionId: string,
  roundId: string,
) {
  return prisma.result.findMany({
    where: { competitionId, roundId },
    select: {
      id: true,
      eventId: true,
      roundId: true,
      person: { select: PERSON_SELECT },
      attempts: {
        orderBy: { attemptNumber: "asc" },
        select: ATTEMPT_DELEGATE_SELECT,
      },
    },
  });
}

export async function getDelegateIncidents(competitionId: string) {
  return prisma.incident.findMany({
    where: { competitionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      source: true,
      description: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
      person: { select: PERSON_SELECT },
      attempt: {
        select: {
          id: true,
          attemptNumber: true,
          result: {
            select: {
              roundId: true,
              eventId: true,
              person: { select: PERSON_SELECT },
            },
          },
        },
      },
    },
  });
}

// All persons in a competition (for the manual-incident person picker).
export async function getPanelPersons(competitionId: string) {
  return prisma.person.findMany({
    where: { competitionId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, registrantId: true, wcaId: true },
  });
}

// Used by the post-comp edit page to fetch a single attempt with its full
// context (event/round/person) for an in-line edit form.
export async function getAttemptForEdit(
  competitionId: string,
  attemptId: string,
) {
  return prisma.attempt.findFirst({
    where: { id: attemptId, competitionId },
    select: {
      ...ATTEMPT_DELEGATE_SELECT,
      result: {
        select: {
          id: true,
          eventId: true,
          roundId: true,
          person: { select: PERSON_SELECT },
        },
      },
    },
  });
}
