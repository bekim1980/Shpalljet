import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import AuthShell from "@/components/auth/AuthShell";
import { buildCurrentPath } from "@/lib/authReturnPath";
import { restoreAuthShellScrollAndFocus } from "@/lib/authShellScrollRestore";
import type { AuthView, OpenAuthShellOptions } from "@/components/auth/types";

type AuthShellContextValue = {
  openAuthShell: (options?: OpenAuthShellOptions) => void;
  closeAuthShell: () => void;
};

const AuthShellContext = createContext<AuthShellContextValue | undefined>(undefined);

export const AuthShellProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  const [initialView, setInitialView] = useState<AuthView>("login");
  const scrollYRef = useRef(0);
  const triggerRef = useRef<HTMLElement | null>(null);
  const location = useLocation();

  const closeAuthShell = useCallback(() => {
    setOpen(false);
  }, []);

  const restoreScrollAndFocus = useCallback(() => {
    const y = scrollYRef.current;
    const trigger = triggerRef.current;
    triggerRef.current = null;
    restoreAuthShellScrollAndFocus(y, trigger);
  }, []);

  const openAuthShell = useCallback(
    (options: OpenAuthShellOptions = {}) => {
      triggerRef.current =
        options.trigger ??
        (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      scrollYRef.current = options.scrollY ?? window.scrollY;
      setReturnTo(options.returnTo ?? buildCurrentPath(location));
      setInitialView(options.view ?? "login");
      setOpen(true);
    },
    [location],
  );

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    closeAuthShell();
  };

  return (
    <AuthShellContext.Provider value={{ openAuthShell, closeAuthShell }}>
      {children}
      <AuthShell
        open={open}
        returnTo={returnTo}
        initialView={initialView}
        onOpenChange={handleOpenChange}
        onClose={closeAuthShell}
        onAfterClose={restoreScrollAndFocus}
      />
    </AuthShellContext.Provider>
  );
};

export const useAuthShell = () => {
  const context = useContext(AuthShellContext);
  if (!context) throw new Error("useAuthShell must be used within AuthShellProvider");
  return context;
};
