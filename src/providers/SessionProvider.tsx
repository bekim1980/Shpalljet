import type { ReactNode } from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { isNextAuthGoogleMode } from "@/config/googleAuthMode";

type Props = {
  children: ReactNode;
};

/**
 * Wraps the app when Auth.js Google mode is enabled (build-time flag).
 */
export function SessionProvider({ children }: Props) {
  if (!isNextAuthGoogleMode()) {
    return <>{children}</>;
  }

  return (
    <NextAuthSessionProvider basePath="/api/auth" refetchOnWindowFocus={false}>
      {children}
    </NextAuthSessionProvider>
  );
}
