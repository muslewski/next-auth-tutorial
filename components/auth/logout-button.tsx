"use client";

import { logout } from "@/actions/logout";

interface LogutButtonProps {
  children?: React.ReactNode;
}

export const LogoutButton = ({ children }: LogutButtonProps) => {
  const onClick = () => {
    logout();
  };

  return <button onClick={onClick}>{children || "Sign out"}</button>;
};
