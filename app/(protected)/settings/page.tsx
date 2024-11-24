"use client";

import { logout } from "@/actions/logout";
import { LogoutButton } from "@/components/auth/logout-button";
import { useCurrentUser } from "@/hooks/use-current-user";

const SettingsPage = () => {
  const user = useCurrentUser();

  const onClick = () => {
    logout();
  };

  return <LogoutButton />;
};

export default SettingsPage;
