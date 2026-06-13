import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/prisma";

// Sessions are JWTs and isAdmin lives on the token, but admin actions are
// security-sensitive so we re-confirm from the database. Reads one row, costs
// nothing, and means revoking admin takes effect immediately.
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true },
  });
  if (!user?.isAdmin) redirect("/dashboard");
  return { userId: user.id };
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return Boolean(u?.isAdmin);
}
