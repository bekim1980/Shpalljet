/// <reference path="./next-auth.d.ts" />
import { createRequire } from "node:module";
import type { NextAuthOptions } from "next-auth";

const require = createRequire(import.meta.url);

/** next-auth providers are CJS; ESM default import breaks under package "type": "module". */
const GoogleProvider = require("next-auth/providers/google").default as (
  options: Record<string, string>,
) => ReturnType<typeof import("next-auth/providers/google").default>;

/** Resolve public auth base URL for NextAuth (v4 reads NEXTAUTH_URL). */
export function ensureNextAuthUrl(): void {
  if (process.env.NEXTAUTH_URL) return;
  const fromAuth =
    process.env.AUTH_URL?.replace(/\/$/, "") ??
    process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (fromAuth) {
    process.env.NEXTAUTH_URL = fromAuth;
    return;
  }
  if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === "google" && account.id_token) {
        token.googleIdToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.googleIdToken === "string") {
        session.googleIdToken = token.googleIdToken;
      }
      return session;
    },
  },
  // Do not set pages.signIn/pages.error to SPA routes (/login). That makes signIn()
  // POST responses redirect to HTML, which breaks next-auth/react's res.json() parse.
};
