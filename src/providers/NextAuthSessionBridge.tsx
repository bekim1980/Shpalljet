import type { ReactNode } from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

type Props = {
  children: ReactNode;
};

/** Lazy-loaded wrapper — only imported when Auth.js Google mode is enabled. */
export function NextAuthSessionBridge({ children }: Props) {
  return (
    <NextAuthSessionProvider basePath="/api/auth" refetchOnWindowFocus={false}>
      {children}
    </NextAuthSessionProvider>
  );
}
