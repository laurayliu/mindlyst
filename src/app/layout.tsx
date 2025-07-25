import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { SessionProvider } from "next-auth/react"; 
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "Mindlyst - Organize Your Thoughts with AI",
  description: "Leverage AI to summarize and organize your mental notes.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Get session on the server using `auth()` from your server/auth/index.ts
  const session = await auth();

  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        {/* Wrap with SessionProvider */}
        <SessionProvider session={session}>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}