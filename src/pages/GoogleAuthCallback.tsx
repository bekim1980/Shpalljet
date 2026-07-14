import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readAuthReturnTo } from "@/pages/AuthCallback";

/**
 * Completes Auth.js Google login by exchanging the Google id_token for a Supabase Auth session.
 * Keeps existing RLS (auth.uid()) working without removing Supabase Auth.
 */
const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const finish = (ok: boolean) => {
      if (!active) return;
      navigate(ok ? readAuthReturnTo() : "/login", { replace: true });
    };

    const bridge = async () => {
      const { getSession, signOut } = await import("next-auth/react");
      const session = await getSession();
      const idToken = session?.googleIdToken;

      if (!idToken) {
        setError("Google sign-in could not complete. Please try again or use email.");
        return;
      }

      const { error: supabaseError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (supabaseError) {
        setError(supabaseError.message);
        return;
      }

      await signOut({ redirect: false });
      finish(true);
    };

    bridge().catch((err: unknown) => {
      if (!active) return;
      const message = err instanceof Error ? err.message : "Google sign-in failed.";
      setError(message);
    });

    return () => {
      active = false;
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
          <p className="text-sm text-muted-foreground">Completing Google sign-in…</p>
        </>
      )}
    </div>
  );
};

export default GoogleAuthCallback;
