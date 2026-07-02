import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Google OIDC id_token — bridged into Supabase Auth on /auth/google-callback. */
    googleIdToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleIdToken?: string;
  }
}
