import NextAuth from "next-auth";
import { authOptions, ensureNextAuthUrl } from "../_lib/authOptions";

ensureNextAuthUrl();

export default NextAuth(authOptions);
