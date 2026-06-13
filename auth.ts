import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { prisma } from "@/prisma";
import authConfig from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        if (user.id) token.id = user.id;
        token.wcaUserId = (user as { wcaUserId?: number | null }).wcaUserId ?? null;
        token.wcaId = (user as { wcaId?: string | null }).wcaId ?? null;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
        return token;
      }

      const id = token.id as string | undefined;
      if (trigger === "update" && id) {
        const dbUser = await prisma.user.findUnique({
          where: { id },
          select: { wcaUserId: true, wcaId: true, isAdmin: true },
        });
        if (dbUser) {
          token.wcaUserId = dbUser.wcaUserId;
          token.wcaId = dbUser.wcaId;
          token.isAdmin = dbUser.isAdmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.wcaUserId = (token.wcaUserId as number | null) ?? null;
      session.user.wcaId = (token.wcaId as string | null) ?? null;
      session.user.isAdmin = Boolean(token.isAdmin);
      return session;
    },
  },
  events: {
    // WCA fields can change (a newcomer earns a wcaId); keep the User row in
    // sync on every sign-in.
    async signIn({ user, profile, account }) {
      if (!user?.id || account?.provider !== "wca" || !profile) return;
      const me = (profile as { me?: { id?: number; wca_id?: string | null } }).me;
      if (!me) return;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          wcaUserId: me.id ?? undefined,
          wcaId: me.wca_id ?? null,
        },
      });
    },
  },
});
