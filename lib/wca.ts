import "server-only";

import { prisma } from "@/prisma";
import { WCA_ORIGIN } from "./constants";

export type WcaCompetition = {
  id: string;
  name: string;
  short_name?: string;
  start_date: string;
  end_date: string;
  registration_open?: string;
  registration_close?: string;
  city?: string;
  country_iso2?: string;
  event_ids?: string[];
  url?: string;
};

export class WcaApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "WcaApiError";
  }
}

export async function wcaApiRequest(path: string, token?: string) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${WCA_ORIGIN}/api/v0/${path}`, {
    method: "GET",
    headers,
    redirect: "follow",
  });
}

export async function upcomingManageableCompetitions(
  token: string,
): Promise<WcaCompetition[]> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    managed_by_me: "true",
    start: oneWeekAgo.toISOString(),
    sort: "start_date",
  });
  const response = await wcaApiRequest(`competitions?${params}`, token);
  if (!response.ok) {
    throw new WcaApiError(
      response.status,
      `WCA competitions request failed: ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as WcaCompetition[];
}

type RefreshResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  created_at?: number;
};

// Returns a valid WCA access token for `userId`, refreshing via the stored
// refresh_token if the current one has expired. Throws if there is no WCA
// account, no refresh token, or the refresh call fails — caller should
// re-prompt sign-in.
export async function getWcaAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "wca" },
  });
  if (!account) throw new Error("No WCA account linked to this user");
  if (!account.access_token) throw new Error("WCA account is missing an access token");

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = account.expires_at ?? 0;
  const isExpired = expiresAt - 60 <= nowSec;

  if (!isExpired) return account.access_token;

  if (!account.refresh_token) {
    throw new Error("WCA access token expired and no refresh token is available");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.refresh_token,
    client_id: process.env.WCA_CLIENT_ID ?? "",
    client_secret: process.env.WCA_CLIENT_SECRET ?? "",
  });

  const res = await fetch(`${WCA_ORIGIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`WCA token refresh failed: ${res.status} ${body}`);
  }

  const tokens = (await res.json()) as RefreshResponse;
  const newExpiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: tokens.access_token,
      expires_at: newExpiresAt,
      refresh_token: tokens.refresh_token ?? account.refresh_token,
      token_type: tokens.token_type ?? account.token_type,
      scope: tokens.scope ?? account.scope,
    },
  });

  return tokens.access_token;
}
