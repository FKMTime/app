import "server-only";

import { prisma } from "@/prisma";
import { getNotifier } from "./index";

// Called after a reconcile transaction commits, with the set of groups whose
// status transitioned from something else to ONGOING. For each such group
// we notify every opted-in user whose Person row is assigned to it.
//
// Dedupe is enforced by NotificationLog's unique (groupId, userId, kind).
// A repeated heartbeat that re-asserts ONGOING can never send a duplicate.
export async function notifyGroupsOngoing(
  competitionId: string,
  groupIds: string[],
): Promise<void> {
  if (groupIds.length === 0) return;

  const notifier = await getNotifier();

  for (const groupId of groupIds) {
    // Load the group + all assigned persons, one query.
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        activityCode: true,
        roomName: true,
        competition: { select: { wcaId: true } },
        assignments: {
          select: {
            role: true,
            person: {
              select: {
                id: true,
                wcaUserId: true,
              },
            },
          },
        },
      },
    });
    if (!group) continue;

    // Match assigned persons to central-app users by wcaUserId.
    const wcaUserIds = group.assignments
      .map((a) => a.person.wcaUserId)
      .filter((n): n is number => n !== null);
    if (wcaUserIds.length === 0) continue;

    // Users with a push subscription opted-in to this competition.
    const users = await prisma.user.findMany({
      where: {
        wcaUserId: { in: wcaUserIds },
        pushSubscriptions: {
          some: { competitions: { some: { competitionId } } },
        },
      },
      select: { id: true, wcaUserId: true },
    });
    if (users.length === 0) continue;

    // Role per person for personalized copy.
    const roleByWcaUserId = new Map<number, string>();
    for (const a of group.assignments) {
      if (a.person.wcaUserId !== null) {
        roleByWcaUserId.set(a.person.wcaUserId, a.role);
      }
    }

    for (const u of users) {
      try {
        // Reserve the dedupe slot BEFORE sending. If the unique constraint
        // is hit we've already notified; skip.
        await prisma.notificationLog.create({
          data: {
            userId: u.id,
            competitionId,
            groupId: group.id,
            kind: "GROUP_ONGOING",
          },
        });
      } catch {
        continue;
      }

      const role = u.wcaUserId ? roleByWcaUserId.get(u.wcaUserId) : undefined;
      const roleWord =
        role === "COMPETITOR" ? "competing" :
        role === "JUDGE" ? "judging" :
        role === "RUNNER" ? "running" :
        role === "SCRAMBLER" ? "scrambling" : "";

      const body = roleWord
        ? `${group.name} is starting${group.roomName ? ` in ${group.roomName}` : ""} — you're ${roleWord}.`
        : `${group.name} is starting${group.roomName ? ` in ${group.roomName}` : ""}.`;

      // Fire and forget. Notifier catches its own errors.
      notifier
        .send(u.id, {
          title: "Your group is up",
          body,
          url: `/competitions/${group.competition.wcaId}`,
          tag: `group-${group.id}`,
        })
        .catch((e) => console.error("[notifier] send failed:", e));
    }
  }
}
