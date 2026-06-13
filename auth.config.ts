import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import { WCA_ORIGIN } from "./lib/constants";

type WCAProfile = {
  me: {
    id: number;
    wca_id: string | null;
    name: string;
    email: string;
    avatar?: { thumb_url?: string | null } | null;
  };
};

const WCAProvider = (): Provider => ({
  id: "wca",
  name: "World Cube Association",
  type: "oauth",
  authorization: {
    url: `${WCA_ORIGIN}/oauth/authorize`,
    params: { scope: "public manage_competitions email" },
  },
  token: `${WCA_ORIGIN}/oauth/token`,
  userinfo: `${WCA_ORIGIN}/api/v0/me`,
  profile(profile: WCAProfile) {
    return {
      id: profile.me.id.toString(),
      name: profile.me.name,
      email: profile.me.email,
      image: profile.me.avatar?.thumb_url || null,
      wcaUserId: profile.me.id,
      wcaId: profile.me.wca_id,
    };
  },
  clientId: process.env.WCA_CLIENT_ID || "example-application-id",
  clientSecret: process.env.WCA_CLIENT_SECRET || "example-secret",
});

export default {
  providers: [WCAProvider()],
  callbacks: {
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isRestricted =
        path.startsWith("/dashboard") ||
        path.startsWith("/panel") ||
        path.startsWith("/admin");
      if (isRestricted) return isLoggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;
