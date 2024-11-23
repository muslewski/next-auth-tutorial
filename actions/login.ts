"use server";

import * as z from "zod";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { LoginSchema } from "@/schemas";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import {
  generateVerificationToken,
  generateTwoFactorToken,
} from "@/lib/tokens";
import { getUserByEmail } from "@/data/user";
import { sendVerificationEmail, sendTwoFactorTokenEmail } from "@/lib/mail";
import { getTwoFactorTokenByEmail } from "@/data/two-factor-token";
import { db } from "@/lib/db";
import { getTwoFactorConfirmationByUserId } from "@/data/two-factor-confirmation";

export const login = async (values: z.infer<typeof LoginSchema>) => {
  const validateFields = LoginSchema.safeParse(values);

  if (!validateFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email, password, code } = validateFields.data;

  const existingUser = await getUserByEmail(email);

  if (!existingUser || !existingUser.email) {
    return { error: "Invalid credentials!" }; // Invalid credentials! for security purpose
  } else if (!existingUser.password) {
    return {
      error:
        "You are not using password credentials, please use your login provider (e.g., GitHub or Google)!",
    };
  }

  // Verify if password is correct
  const passwordsMatch = await bcrypt.compare(password, existingUser.password);
  if (!passwordsMatch) return { error: "Invalid credentials!" };

  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(
      existingUser.email
    );

    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token
    );

    return { success: "Confirmation email sent!" };
  }

  if (existingUser.isTwoFactorEnabled && existingUser.email) {
    if (code) {
      // ! Problem that when the code is 0 char it is being generated again
      // ? Add the logic that when 2fa activated then when changing password it should be firstly asked for 2fa code

      // Verify code
      const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

      if (!twoFactorToken) return { error: "Invalid code!" };
      if (twoFactorToken.token !== code) return { error: "Invalid code!" };

      // Check if the code has expired
      const hasExpired = new Date(twoFactorToken.expires) < new Date();

      if (hasExpired) return { error: "Code has expired!" };

      // Delete the two factor token
      await db.twoFactorToken.delete({
        where: { id: twoFactorToken.id },
      });

      const existingConfirmation = await getTwoFactorConfirmationByUserId(
        existingUser.id
      );

      if (existingConfirmation) {
        await db.twoFactorConfirmation.delete({
          where: { id: existingConfirmation.id },
        });
      }

      await db.twoFactorConfirmation.create({
        data: {
          userId: existingUser.id,
        },
      });
    } else {
      // Check if the user already has two factor token
      const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

      if (twoFactorToken)
        return { error: "The code has already been sent.", twoFactor: true };
      else {
        const twoFactorToken = await generateTwoFactorToken(existingUser.email);

        await sendTwoFactorTokenEmail(
          twoFactorToken.email,
          twoFactorToken.token
        );

        return {
          twoFactor: true,
        };
      }
    }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: DEFAULT_LOGIN_REDIRECT,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials!" };
        default:
          return { error: "Something went wrong!" };
      }
    }

    throw error;
  }
};
