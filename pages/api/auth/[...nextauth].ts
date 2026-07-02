/**
 * NextAuth v4 convention path (Pages Router). This Vite app is served on Vercel via
 * `api/auth/[...nextauth].ts`; this file reuses the same handler for parity with
 * NextAuth tooling that expects `pages/api/auth/[...nextauth].ts`.
 */
import { createNextAuthHandler } from "../../../api/_lib/createNextAuthHandler.js";

export default createNextAuthHandler();
