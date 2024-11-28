"use server";

import { signOut } from "@/auth";
import { publicRoutes } from "@/routes";

export const logout = async () => {
  await signOut({ redirectTo: publicRoutes[0] });
};
