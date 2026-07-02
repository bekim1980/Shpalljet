import { createRequire } from "node:module";
import { authOptions, ensureNextAuthUrl } from "../_lib/authOptions.js";

const require = createRequire(import.meta.url);

/** next-auth is CJS; ESM default import is an object under package "type": "module". */
const NextAuth = require("next-auth").default as typeof import("next-auth").default;

ensureNextAuthUrl();

export default NextAuth(authOptions);
