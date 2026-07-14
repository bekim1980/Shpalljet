import { useCallback, useRef, type PointerEvent, type SyntheticEvent } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthShell } from "@/contexts/AuthShellProvider";
import { buildCurrentPath } from "@/lib/authReturnPath";
import type { OpenAuthShellOptions } from "@/components/auth/types";

export type RequireAuthShellOptions = Omit<OpenAuthShellOptions, "view"> & {
  /** Close nested dialogs before opening the auth shell. */
  onBeforeAuth?: () => void;
};

export function captureAuthShellContext(
  event: SyntheticEvent,
): Pick<RequireAuthShellOptions, "trigger" | "scrollY"> {
  return {
    trigger: event.currentTarget instanceof HTMLElement ? event.currentTarget : null,
    scrollY: typeof window !== "undefined" ? window.scrollY : 0,
  };
}

export function useAuthShellTriggerCapture() {
  const scrollYRef = useRef(0);
  const triggerRef = useRef<HTMLElement | null>(null);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    scrollYRef.current = window.scrollY;
    triggerRef.current = e.currentTarget;
  }, []);

  const pointerOptions = useCallback(
    (): Pick<RequireAuthShellOptions, "scrollY" | "trigger"> => ({
      scrollY: scrollYRef.current,
      trigger: triggerRef.current,
    }),
    [],
  );

  return { onPointerDown, pointerOptions };
}

export function useRequireAuthShell() {
  const { user } = useAuth();
  const { openAuthShell } = useAuthShell();
  const location = useLocation();

  const requireAuth = useCallback(
    (action: () => void | Promise<void>, options: RequireAuthShellOptions = {}): boolean => {
      if (user) {
        void action();
        return true;
      }

      options.onBeforeAuth?.();

      const { onBeforeAuth: _onBeforeAuth, ...shellOptions } = options;
      openAuthShell({
        returnTo: shellOptions.returnTo ?? buildCurrentPath(location),
        scrollY: shellOptions.scrollY,
        trigger: shellOptions.trigger,
      });

      return false;
    },
    [user, openAuthShell, location],
  );

  return { user, requireAuth };
}
