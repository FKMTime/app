import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { prisma } from "@/prisma";
import authConfig from "./auth.config"


export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  debug: true,
  callbacks: {
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isRestrictedPage = request.nextUrl.pathname.startsWith("/dashboard");
      if (isRestrictedPage) {
        if (isLoggedIn) return true;
        return false;
      }
      return true;
    },
  },
  pages: {
    signIn: "/",
  },
  ...authConfig,
});
