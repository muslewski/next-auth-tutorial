import NextAuth, { type DefaultSession } from "next-auth";
import authConfig from "@/auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getUserById } from "@/data/user";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      role?: UserRole;
    } & DefaultSession["user"];
  }
  interface User {
    role?: UserRole;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  callbacks: {
    // async signIn({ user }) {
    //   const existingUser = await getUserById(user.id as string);

    //   if (!existingUser || !existingUser.emailVerified) {
    //     return false;
    //   }

    //   return true;
    // },
    async session({ token, session }) {
      console.log({ sessionToken: token });
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (token.role && session.user) {
        session.user.role = token.role as UserRole;
      }

      return session;
    },

    async jwt({ token, session, user, trigger }) {
      if (!token.sub) return token;

      if (
        trigger === "signIn" ||
        trigger === "signUp" ||
        (trigger === "update" && session?.user?.role)
      ) {
        if (user) {
          token.role = user.role as UserRole;
        } else if (session?.user?.role) {
          token.role = session.user.role;
        }
      }
      // const existingUser = await getUserById(token.sub);
      // if (!existingUser) return token;
      // token.role = existingUser.role;

      return token;
    },
  },
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
});
