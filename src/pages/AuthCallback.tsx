import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const RETURN_KEY = "shpalljet:authReturnTo";

export function setAuthReturnTo(path: string) {
  try {
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* noop */
  }
}

function readAuthReturnTo(): string {
  try {
    const stored = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (stored && stored.startsWith("/")) return stored;
  } catch {
    /* noop */
  }
  return "/";
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const finish = (session: boolean) => {
      if (!active) return;
      navigate(session ? readAuthReturnTo() : "/login", { replace: true });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        finish(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (session) finish(true);
    });

    const timeout = window.setTimeout(() => {
      if (!active) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) setError("Sign-in could not be completed. Please try again.");
        else finish(true);
      });
    }, 8000);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      {error ? (
        <>
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => navigate("/login", { replace: true })}
          >
            Back to login
          </button>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Completing sign-in…</p>
        </>
      )}
    </div>
  );
};

export default AuthCallback;
