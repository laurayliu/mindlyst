import { MindlystClient } from "./_components/MindlystClient";
import { auth } from "~/server/auth";
import { SessionProvider } from "next-auth/react";
import FloatyBackground from "./_components/FloatyBackground";

export default async function HomePage() {
  const session = await auth();
  return (
    // main element holds full-screen background gradient
    <main className="flex min-h-screen flex-col items-center justify-center relative
                     bg-gradient-to-b from-background to-primary text-text">
      
      <FloatyBackground />
      
      <div className="relative z-10 w-full py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        <SessionProvider session={session}>
          <MindlystClient />
        </SessionProvider>
      </div>
    </main>
  );
}