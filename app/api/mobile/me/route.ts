import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { requireMobileSession } from "@/lib/mobile/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const s = await requireMobileSession(req);
  if (!s.ok) return NextResponse.json({ error: s.error }, { status: s.status });

  const user = await prisma.user.findUnique({
    where: { id: s.session.userId },
    select: {
      id: true,
      wcaUserId: true,
      wcaId: true,
      name: true,
      email: true,
      image: true,
      isAdmin: true,
    },
  });
  return NextResponse.json({ user });
}
