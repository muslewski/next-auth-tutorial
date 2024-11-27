import authConfig from "@/auth.config";
import { getAccountByUserId } from "@/data/account";
import { getTwoFactorConfirmationByUserId } from "@/data/two-factor-confirmation";
import { getUserById } from "@/data/user";
import { db } from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import NextAuth from "next-auth";

export const { auth, handlers, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  events: {
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Allow OAuth without email verification
      if (account?.provider !== "credentials") {
        return true;
      }

      // Default behavior for credentials or new users
      const existingUser = await getUserById(user.id as string);

      // Prevent sign in without email verification
      if (!existingUser?.emailVerified) return false;

      // Add 2FA check
      if (existingUser.isTwoFactorEnabled) {
        const twoFactorConfirmation = await getTwoFactorConfirmationByUserId(
          existingUser.id
        );

        console.log({ twoFactorConfirmation });

        if (!twoFactorConfirmation) return false;

        // Delete two factor confirmation for next sign in
        await db.twoFactorConfirmation.delete({
          where: { id: twoFactorConfirmation.id },
        });
      }

      return true;
    },
    async session({ token, session }) {
      // console.log({ sessionToken: token });
      if (token.sub && session.user) session.user.id = token.sub;

      if (token.role && session.user)
        session.user.role = token.role as UserRole;

      // Add this: map picture to image
      if (token.picture && session.user) session.user.image = token.picture;

      if (session.user)
        session.user.isTwoFactorEnabled = token.isTwoFactorEnabled as boolean;

      if (session.user) {
        session.user.isOAuth = token.isOAuth as boolean;
        session.user.name = token.name;
        session.user.email = token.email as string;
      }

      return session;
    },

    async jwt({
      token,
      //  session, user, trigger
    }) {
      if (!token.sub) return token;

      // if (
      //   trigger === "signIn" ||
      //   trigger === "signUp" ||
      //   (trigger === "update" && session?.user?.role)
      // ) {
      //   if (user) {
      //     token.role = user.role as UserRole;
      //     token.isTwoFactorEnabled = user.isTwoFactorEnabled;
      //   } else if (session?.user?.role) {
      //     token.role = session.user.role;
      //     token.isTwoFactorEnabled = session.user.isTwoFactorEnabled;
      //   }
      // }

      const existingUser = await getUserById(token.sub);
      if (!existingUser) return token;

      const existingAccount = await getAccountByUserId(existingUser.id);

      token.isOAuth = !!existingAccount;
      token.name = existingUser.name;
      token.email = existingUser.email;
      token.role = existingUser.role;
      token.isTwoFactorEnabled = existingUser.isTwoFactorEnabled;

      return token;
    },
  },
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
});
