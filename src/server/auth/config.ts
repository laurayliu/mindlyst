// src/server/auth/config.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession } from "next-auth";
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db"; // Your Prisma client instance
import { env } from "~/env.js"; // Using env.js as per your setup

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
    accessToken?: string; // Add accessToken to session (important for Google APIs)
  }
  // Augment the JWT type to include accessToken
  interface JWT {
    accessToken?: string;
  }
}

// Define the expected structure of the Google profile object
// This ensures type safety when accessing properties like 'sub', 'name', 'email', 'picture'.
interface GoogleProfile {
  sub: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  // Add other properties if you need to access them from the Google profile
  // For example, if you need email_verified: boolean;
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
      // Explicitly type the 'profile' parameter using our new interface
      profile(profile: GoogleProfile) { // <--- FIXED LINE: Type the profile parameter
        return {
          id: profile.sub, // 'sub' is guaranteed to be a string per OpenID Connect
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  secret: env.AUTH_SECRET,
} satisfies NextAuthConfig;