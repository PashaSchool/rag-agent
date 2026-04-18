import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./lib/prisma";
import authConfig from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    // runs whenever the JWT is created or updated
    jwt: async ({ user, token }) => {
      if (user) token.id = user.id;

      return token;
    },
    // runs every time session() is read
    session: async ({ session, token }) => {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
  ...authConfig,
});
