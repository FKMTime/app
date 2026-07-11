import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/prisma";

export const runtime = "nodejs";

// Body shape as returned by PushSubscription.toJSON() on the client.
const bodySchema = z
  .object({
    endpoint: z.string().url(),
    keys: z
      .object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      })
      .strict(),
    competitionIds: z.array(z.string().min(1)).max(50).default([]),
  })
  .strict();

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", issues: parsed.error.issues }, { status: 400 });
  }

  const { endpoint, keys, competitionIds } = parsed.data;
  const userAgent = req.headers.get("user-agent")?.slice(0, 255) ?? null;

  // Upsert the subscription; endpoint is unique.
  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      authKey: keys.auth,
      userAgent,
    },
    update: {
      userId: session.user.id,
      p256dh: keys.p256dh,
      authKey: keys.auth,
      userAgent,
    },
    select: { id: true },
  });

  if (competitionIds.length > 0) {
    // Only accept comps the user actually has a relationship to (person
    // matched by wcaUserId, or explicit role, or admin). Silently drops the
    // rest — client trust boundary.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { wcaUserId: true, isAdmin: true },
    });
    const allowed = await prisma.competition.findMany({
      where: {
        id: { in: competitionIds },
        status: { in: ["APPROVED", "LIVE", "FINISHED"] },
        OR: [
          user?.isAdmin ? {} : { id: "__never" },
          ...(user?.wcaUserId
            ? [{ persons: { some: { wcaUserId: user.wcaUserId } } }]
            : []),
          { roles: { some: { userId: session.user.id } } },
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
