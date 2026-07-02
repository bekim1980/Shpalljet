import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Google OIDC id_token (first sign-in only) — used to bridge into Supabase Auth. */
    googleIdToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleIdToken?: string;
  }
}
