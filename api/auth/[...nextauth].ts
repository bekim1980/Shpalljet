import type { VercelRequest, VercelResponse } from "@vercel/node";
import NextAuth from "next-auth";
import { authOptions, ensureNextAuthUrl } from "../_lib/authOptions";

ensureNextAuthUrl();

const handler = NextAuth(authOptions);

export default function authHandler(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
