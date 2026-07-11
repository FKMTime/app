import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma";
import { wcaApiRequest } from "@/lib/wca";
import { issueMobileToken, MOBILE_JWT_TTL_SECONDS } from "@/lib/mobile/session";

export const runtime = "nodejs";

// The Expo client:
//   1. Runs WCA OAuth (PKCE) against WCA directly — WCA is the identity
//      provider, our server never sees the WCA client secret.
//   2. Sends the resulting WCA access token here.
//   3. We verify by hitting /api/v0/me, upsert a User, and mint our own JWT.
//   4. The client uses OUR JWT for all subsequent /api/mobile/* calls.
//
// We do NOT store the WCA access token — the mobile app manages its own
// refresh cycle against WCA. If the token ever expires, the client re-runs
// PKCE and re-exchanges.
const bodySchema = z
  .object({ wcaAccessToken: z.string().min(20).max(4096) })
  .strict();

type WcaMe = {
  me: {
    id: number;
    wca_id: string | null;
    name: string;
    email: string;
    avatar?: { thumb_url?: string | null } | null;
  };
};

export async function POST(req: Request) {
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

  const wcaRes = await wcaApiRequest("me", parsed.data.wcaAccessToken);
  if (!wcaRes.ok) {
    return NextResponse.json(
      { error: "WCA rejected the access token" },
      { status: 401 },
    );
  }
  const me = ((await wcaRes.json()) as WcaMe).me;

  // Upsert by WCA user id (stable, unique).
  const user = await prisma.user.upsert({
    where: { wcaUserId: me.id },
    create: {
      wcaUserId: me.id,
      wcaId: me.wca_id,
      name: me.name,
      email: me.email,
      image: me.avatar?.thumb_url ?? null,
    },
    update: {
      wcaId: me.wca_id,
      name: me.name,
      email: me.email,
      image: me.avatar?.thumb_url ?? null,
    },
    select: { id: true, wcaUserId: true, wcaId: true, name: true, email: true, image: true, isAdmin: true },
  });

  const token = await issueMobileToken({
    sub: user.id,
    wcaUserId: user.wcaUserId,
    wcaId: user.wcaId,
  });

  return NextResponse.json({
    token,
    expiresIn: MOBILE_JWT_TTL_SECONDS,
    user: {
      id: user.id,
      wcaUserId: user.wcaUserId,
      wcaId: user.wcaId,
      name: user.name,
      email: user.email,
      image: user.image,
      isAdmin: user.isAdmin,
    },
  });
}
