"use server";

import * as z from "zod";
import { NewPasswordSchema } from "@/schemas";
import { getPasswordResetTokenByToken } from "@/data/password-reset-token";
import { getUserByEmail } from "@/data/user";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const newPassword = async (
  values: z.infer<typeof NewPasswordSchema>,
  token: string | null
) => {
  if (!token) {
    return { error: "Missing token!" };
  }

  // Validate the fields
  const validatedFields = NewPasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { password } = validatedFields.data;

  // Check if the token exists
  const existingToken = await getPasswordResetTokenByToken(token);

  if (!existingToken) {
    return { error: "Invalid token!" };
  }

  // Check if the token has expired
  const hasExpired = new Date(existingToken.expires) < new Date();

  if (hasExpired) {
    return { error: "Token has expired!" };
  }

  // Check if the email exists
  const existingUser = await getUserByEmail(existingToken.email);

  if (!existingUser) {
    return { error: "Email does not exist!" };
  }

  // Check if the password is the same as the old one
  if (!existingUser.password) {
    return {
      error:
        "You are not using password credentials, please use your login provider (e.g., GitHub or Google)!",
      social: true,
    }; // that means the user was created without a password
  }
  const isSamePassword = await bcrypt.compare(password, existingUser.password);

  if (isSamePassword) {
    return { error: "Password cannot be the same as the old one!" };
  }

  // Hash the password and save it to the user
  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  //Delete the token after the password has been updated
  await db.passwordResetToken.delete({
    where: {
      id: existingToken.id,
    },
  });

  return { success: "Password updated!" };
};
