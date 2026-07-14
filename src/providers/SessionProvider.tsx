import type { ReactNode } from "react";
import { Suspense, lazy } from "react";
import { isNextAuthGoogleMode } from "@/config/googleAuthMode";

const NextAuthSessionBridge = lazy(() =>
  import("./NextAuthSessionBridge").then((m) => ({ default: m.NextAuthSessionBridge })),
);

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
    <Suspense fallback={<>{children}</>}>
      <NextAuthSessionBridge>{children}</NextAuthSessionBridge>
    </Suspense>
  );
}
