import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession } from "next-auth";
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db"; // prisma client instance
import { env } from "~/env.js";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface JWT {
    accessToken?: string;
  }
}

interface GoogleProfile {
  sub: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  given_name?: string | null;
  family_name?: string | null;
}


/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session: ({
      session,
      token,
      user,
    }) => {
      session.user.id = token.sub ?? user.id;
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
    jwt: async ({ token, account }) => {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "https://www.googleapis.com/auth/tasks openid profile email",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
      // maps google's profile data to nextauth.js user type
      profile(profile: GoogleProfile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  secret: env.AUTH_SECRET,
} satisfies NextAuthConfig;