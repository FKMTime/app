"use server";

import { auth } from "@/auth";

export const getUpcomingManageableCompetitions = async () => {
    const session  = auth();
    console.log(session);
};