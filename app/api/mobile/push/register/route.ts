import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma";
import { requireMobileSession } from "@/lib/mobile/session";

export const runtime = "nodejs";

// Register (or refresh) an Expo push token for the signed-in mobile user.
//
// Storage model: we reuse the existing PushSubscription table. Expo tokens
// have the shape "ExponentPushToken[...]"; we store the whole thing in the
// `endpoint` column (still unique per-device) and put a sentinel value in
// the WebPush-specific columns so the DB schema doesn't need a new table.
// The delivery layer chooses transport by inspecting the endpoint prefix
// — TODO once Expo delivery is wired.

const bodySchema = z
  .object({
    expoPushToken: z.string().min(10).max(255),
    competitionIds: z.array(z.string().min(1)).max(50).default([]),
    deviceName: z.string().max(255).optional(),
  })
  .strict();

const EXPO_PLACEHOLDER = "expo";

export async function POST(req: Request) {
  const s = await requireMobileSession(req);
  if (!s.ok) return NextResponse.json({ error: s.error }, { status: s.status });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { expoPushToken, competitionIds, deviceName } = parsed.data;

  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint: expoPushToken },
    create: {
      userId: s.session.userId,
      endpoint: expoPushToken,
      p256dh: EXPO_PLACEHOLDER,
      authKey: EXPO_PLACEHOLDER,
      userAgent: deviceName ?? null,
    },
    update: {
      userId: s.session.userId,
      userAgent: deviceName ?? null,
    },
    select: { id: true },
  });

  if (competitionIds.length > 0) {
    const allowed = await prisma.competition.findMany({
      where: {
        id: { in: competitionIds },
        status: { in: ["APPROVED", "LIVE", "FINISHED"] },
        OR: [
          ...(s.session.wcaUserId
            ? [{ persons: { some: { wcaUserId: s.session.wcaUserId } } }]
            : []),
          { roles: { some: { userId: s.session.userId } } },
        ],
      },
      select: { id: true },
    });
    if (allowed.length > 0) {
      await prisma.pushCompetitionOptIn.createMany({
        data: allowed.map((c) => ({
          subscriptionId: sub.id,
          competitionId: c.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json({ ok: true, subscriptionId: sub.id });
}
