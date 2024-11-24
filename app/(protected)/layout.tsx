import { Navbar } from "@/app/(protected)/_components/navbar";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <div
        className="h-full w-full flex flex-col gap-y-10 items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400
    to-blue-800"
      >
        <Navbar />
        {children}
      </div>
    </SessionProvider>
  );
}
