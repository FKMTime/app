import "server-only";

import { prisma } from "@/prisma";

// Public data layer for competitor/spectator pages.
//
// CRITICAL: never select Attempt.description (delegate-only notes/extra
// reasons) and never include any Incident table fields. These helpers are
// the ONLY way the public routes read sync data — keeping the selects
// here means a future page can't accidentally leak a description by
// reaching for `prisma.attempt.findMany()` directly.

// Status filter: REQUESTED/REJECTED comps must not be discoverable.
const PUBLIC_STATUSES = ["APPROVED", "LIVE", "FINISHED"] as const;

const PERSON_PUBLIC_SELECT = {
  id: true,
  registrantId: true,
  name: true,
  wcaId: true,
  countryIso2: true,
  gender: true,
} as const;

const ATTEMPT_PUBLIC_SELECT = {
  id: true,
  attemptNumber: true,
  value: true,
  penalty: true,
  type: true,
  replacedBy: true,
  status: true,
  // description is INTENTIONALLY excluded.
} as const;

export async function getPublicCompetitionByWcaId(wcaId: string) {
  return prisma.competition.findFirst({
    where: { wcaId, status: { in: PUBLIC_STATUSES as unknown as ("APPROVED" | "LIVE" | "FINISHED")[] } },
    select: {
      id: true,
      wcaId: true,
      name: true,
      shortName: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });
}

export async function getOngoingGroups(competitionId: string) {
  return prisma.group.findMany({
    where: { competitionId, status: "ONGOING" },
    orderBy: [{ activityCode: "asc" }],
    select: {
      id: true,
      activityCode: true,
      name: true,
      roomName: true,
      roomColor: true,
      status: true,
      startTime: true,
      endTime: true,
    },
  });
}

export async function getAllGroups(competitionId: string) {
  return prisma.group.findMany({
    where: { competitionId },
    orderBy: [
      { startTime: { sort: "asc", nulls: "last" } },
      { activityCode: "asc" },
    ],
    select: {
      id: true,
      activityCode: true,
      name: true,
      roomName: true,
      roomColor: true,
      status: true,
      startTime: true,
      endTime: true,
    },
  });
}

export async function getResultsForRound(
  competitionId: string,
  roundId: string,
) {
  return prisma.result.findMany({
    where: { competitionId, roundId },
    select: {
      id: true,
      eventId: true,
      roundId: true,
      person: { select: PERSON_PUBLIC_SELECT },
      attempts: {
        orderBy: { attemptNumber: "asc" },
        select: ATTEMPT_PUBLIC_SELECT,
      },
    },
  });
}

export async function getRoundsForCompetition(competitionId: string) {
  // Distinct (eventId, roundId) pairs that have any result. Cheaper than
  // selecting all results.
  return prisma.result.findMany({
    where: { competitionId },
    distinct: ["eventId", "roundId"],
    orderBy: [{ eventId: "asc" }, { roundId: "asc" }],
    select: { eventId: true, roundId: true },
  });
}

// The distinct set of events with any Result — used for chips on the hub page.
export async function getEventIdsForCompetition(competitionId: string) {
  const rows = await prisma.result.findMany({
    where: { competitionId },
    distinct: ["eventId"],
    orderBy: { eventId: "asc" },
    select: { eventId: true },
  });
  return rows.map((r) => r.eventId);
}

export async function getCompetitorCount(competitionId: string) {
  return prisma.person.count({ where: { competitionId } });
}

// Full competitor list for the /competitors index — public-safe fields only.
export async function getCompetitorList(competitionId: string) {
  return prisma.person.findMany({
    where: { competitionId },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      registrantId: true,
      name: true,
      wcaId: true,
      countryIso2: true,
    },
  });
}

// Organizers + delegates for a public competition page. Sourced from the
// CompetitionRole table (WCIF sync); each row is a User already in our DB.
// We surface name, WCA ID, and role kind — nothing sensitive.
export async function getPublicCompetitionRoles(competitionId: string) {
  return prisma.competitionRole.findMany({
    where: { competitionId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      role: true,
      source: true,
      user: {
        select: {
          name: true,
          wcaId: true,
          image: true,
        },
      },
    },
  });
}

// Public index of competitions (LIVE first, then APPROVED, then FINISHED).
export async function getPublicCompetitionsIndex() {
  return prisma.competition.findMany({
    where: {
      status: { in: ["LIVE", "APPROVED", "FINISHED"] },
    },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
    select: {
      id: true,
      wcaId: true,
      name: true,
      shortName: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });
}

export async function getCompetitorByRegistrantId(
  competitionId: string,
  registrantId: number,
) {
  return prisma.person.findFirst({
    where: { competitionId, registrantId },
    select: {
      ...PERSON_PUBLIC_SELECT,
      assignments: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          role: true,
          group: {
            select: {
              id: true,
              activityCode: true,
              name: true,
              roomName: true,
              status: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      },
      results: {
        orderBy: [{ eventId: "asc" }, { roundId: "asc" }],
        select: {
          id: true,
          eventId: true,
          roundId: true,
          attempts: {
            orderBy: { attemptNumber: "asc" },
            select: ATTEMPT_PUBLIC_SELECT,
          },
        },
      },
    },
  });
}
