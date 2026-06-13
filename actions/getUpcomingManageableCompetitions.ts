"use server";

import { auth } from "@/auth";
import {
  getWcaAccessToken,
  upcomingManageableCompetitions,
  type WcaCompetition,
} from "@/lib/wca";

export async function getUpcomingManageableCompetitions(): Promise<
  WcaCompetition[]
> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const token = await getWcaAccessToken(session.user.id);
  return upcomingManageableCompetitions(token);
}
