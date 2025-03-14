import type { NextAuthConfig } from "next-auth"
import { Provider } from "next-auth/providers";
 
const WCAProvider = (): Provider => ({
    id: "wca",
    name: "World Cube Association",
    type: "oauth",
    authorization: {
      url: "https://www.worldcubeassociation.org/oauth/authorize",
      params: { scope: "public manage_competitions" },
    },
    token: "https://www.worldcubeassociation.org/oauth/token",
    userinfo: "https://www.worldcubeassociation.org/api/v0/me",
    profile(profile) {
      return {
        id: profile.me.id.toString(),
        name: profile.me.name,
        email: profile.me.email,
        image: profile.me.avatar?.thumb_url || null,
      };
    },
    clientId: process.env.WCA_CLIENT_ID,
    clientSecret: process.env.WCA_CLIENT_SECRET,
  });

  
export default {
  providers: [WCAProvider()],
} satisfies NextAuthConfig