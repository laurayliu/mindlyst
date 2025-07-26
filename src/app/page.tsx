import { MindlystClient } from "./_components/MindlystClient";
import { auth } from "~/server/auth";
import { SessionProvider } from "next-auth/react";

export default async function HomePage() {

  const session = await auth();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#1a202c] to-[#2d3748] text-white">
      <SessionProvider session={session}>
        <MindlystClient />
      </SessionProvider>
    </main>
  );
}