import Link from "next/link";
import { auth } from "~/server/auth";
import TaskList from "./_components/TaskList";


export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          <span className="text-[hsl(280,100%,70%)]">Mindlyst</span>
        </h1>

        <div className="flex flex-col items-center gap-2">
          <p className="text-2xl text-white">
            {session ? `Logged in as ${session.user?.name}` : "Please sign in"}
          </p>

          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
          >
            {session ? "Sign out" : "Sign in"}
          </Link>
        </div>

        {/* Conditionally render TaskList only if session exists */}
        {session && <TaskList />}
      </div>
    </main>
  );
}