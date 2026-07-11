import "server-only";

import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { prisma } from "@/prisma";

// Mobile clients (Expo) authenticate against WCA on their own device, then
// POST the resulting WCA access token to /api/mobile/auth/wca. We verify the
// token by calling WCA's /me, upsert a User row, and mint our own
// short-JWT which the client sends on subsequent calls.
//
// Why a separate token instead of accepting the WCA token on every request:
//   - No extra WCA round-trip per API call.
//   - Server-side revocation surface if we ever need it.
//   - Doesn't hand WCA tokens to our data-layer plumbing.

const JWT_ISSUER = "fkmtime-central";
const JWT_AUDIENCE = "fkmtime-mobile";
export const MOBILE_JWT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30d

function getSecret(): Uint8Array {
  const raw = process.env.MOBILE_JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "MOBILE_JWT_SECRET (or NEXTAUTH_SECRET fallback) must be at least 32 chars",
    );
  }
  return new TextEncoder().encode(raw);
}

export type MobileClaims = {
  sub: string; // our User.id
  wcaUserId: number | null;
  wcaId: string | null;
};

export async function issueMobileToken(claims: MobileClaims): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    wcaUserId: claims.wcaUserId,
    wcaId: claims.wcaId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + MOBILE_JWT_TTL_SECONDS)
    .sign(getSecret());
}

export type MobileSession = {
  userId: string;
  wcaUserId: number | null;
  wcaId: string | null;
};

export async function verifyMobileToken(token: string): Promise<MobileSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload.sub !== "string") return null;
    return {
      userId: payload.sub,
      wcaUserId: (payload.wcaUserId as number | null | undefined) ?? null,
      wcaId: (payload.wcaId as string | null | undefined) ?? null,
    };
  } catch (e) {
    if (
      e instanceof joseErrors.JWTExpired ||
      e instanceof joseErrors.JWTInvalid ||
      e instanceof joseErrors.JWSSignatureVerificationFailed
    ) {
      return null;
    }
    throw e;
  }
}

// Resolve `Authorization: Bearer <jwt>` on an incoming request to a session,
// re-hydrated from DB (so revocation-via-user-delete works too).
export async function requireMobileSession(
  req: Request,
): Promise<
  | { ok: true; session: MobileSession }
  | { ok: false; status: 401; error: string }
> {
  const authz = req.headers.get("authorization") ?? "";
  if (!authz.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const token = authz.slice(7).trim();
  const claims = await verifyMobileToken(token);
  if (!claims) return { ok: false, status: 401, error: "Invalid or expired token" };

  // Reject if user has been deleted between token issue and now.
  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, wcaUserId: true, wcaId: true },
  });
  if (!user) return { ok: false, status: 401, error: "User no longer exists" };

  return {
    ok: true,
    session: {
      userId: user.id,
      wcaUserId: user.wcaUserId,
      wcaId: user.wcaId,
    },
  };
}
