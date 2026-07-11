import "server-only";

import { prisma } from "@/prisma";

// Data layer for the mobile API.
//
// Same delegate-secrecy rule as lib/data/public.ts: never select
// Attempt.description, never include Incident rows. The mobile app is a
// public/competitor face — organizers/delegates use the web panel.

const PUBLIC_STATUSES = ["APPROVED", "LIVE", "FINISHED"] as const;

const PERSON_SELECT = {
  id: true,
  registrantId: true,
  name: true,
  wcaId: true,
  countryIso2: true,
  gender: true,
} as const;

const ATTEMPT_SELECT = {
  id: true,
  attemptNumber: true,
  value: true,
  penalty: true,
  type: true,
  replacedBy: true,
  status: true,
  // description INTENTIONALLY excluded
} as const;

const GROUP_SELECT = {
  id: true,
  activityCode: true,
  name: true,
  roomName: true,
  roomColor: true,
  status: true,
  startTime: true,
  endTime: true,
} as const;

// Comps the mobile user cares about: they're registered (Person matched by
// wcaUserId), OR they have a competition role. Only APPROVED/LIVE/FINISHED
// are ever surfaced.
export async function getCompetitionsForMobileUser(params: {
  userId: string;
  wcaUserId: number | null;
}) {
  const { userId, wcaUserId } = params;
  return prisma.competition.findMany({
    where: {
      status: { in: PUBLIC_STATUSES as unknown as ("APPROVED" | "LIVE" | "FINISHED")[] },
      OR: [
        ...(wcaUserId ? [{ persons: { some: { wcaUserId } } }] : []),
        { roles: { some: { userId } } },
        { requestedById: userId },
      ],
    },
    orderBy: { startDate: "asc" },
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

export async function getMobileCompetitionByWcaId(wcaId: string) {
  return prisma.competition.findFirst({
    where: {
      wcaId,
      status: { in: PUBLIC_STATUSES as unknown as ("APPROVED" | "LIVE" | "FINISHED")[] },
    },
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
    select: GROUP_SELECT,
  });
}

export async function getAllGroups(competitionId: string) {
  return prisma.group.findMany({
    where: { competitionId },
    orderBy: [
      { startTime: { sort: "asc", nulls: "last" } },
      { activityCode: "asc" },
    ],
    select: GROUP_SELECT,
  });
}

// The signed-in user's own person row in a competition, matched by WCA
// user id — plus their assignments and results.
export async function getMyPersonInCompetition(params: {
  competitionId: string;
  wcaUserId: number;
}) {
  return prisma.person.findFirst({
    where: {
      competitionId: params.competitionId,
      wcaUserId: params.wcaUserId,
    },
    select: {
      ...PERSON_SELECT,
      assignments: {
        orderBy: [{ group: { startTime: "asc" } }, { group: { activityCode: "asc" } }],
        select: {
          id: true,
          role: true,
          group: { select: GROUP_SELECT },
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
            select: ATTEMPT_SELECT,
          },
        },
      },
    },
  });
}

// Round results for the given round, public-safe.
export async function getRoundResults(competitionId: string, roundId: string) {
  return prisma.result.findMany({
    where: { competitionId, roundId },
    select: {
      id: true,
      eventId: true,
      roundId: true,
      person: { select: PERSON_SELECT },
      attempts: {
        orderBy: { attemptNumber: "asc" },
        select: ATTEMPT_SELECT,
      },
    },
  });
}
