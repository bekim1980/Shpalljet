import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useVertical, type Vertical } from "@/contexts/VerticalContext";

// Routes that must always render with the brand "luxe" (dark + gold) theme,
// regardless of which vertical the user last selected.
const LUXE_ROUTES = new Set<string>(["/", "/index", "/login", "/install", "/pricing", "/auth/callback"]);

const VALID_VERTICALS: Vertical[] = ["luxe", "market", "rent", "services", "jobs"];

const isXhiroRoute = (pathname: string) =>
  pathname === "/rides" || pathname.startsWith("/rides/") || pathname === "/my-rides";

const VerticalThemeWrapper = ({ children }: { children: ReactNode }) => {
  const { vertical } = useVertical();
  const { pathname, search } = useLocation();

  // URL is the source of truth on /browse: ?vertical=market|rent|services|luxe|jobs
  const urlVertical = (() => {
    if (pathname !== "/browse") return null;
    const v = new URLSearchParams(search).get("vertical");
    return v && (VALID_VERTICALS as string[]).includes(v) ? (v as Vertical) : null;
  })();

  const effectiveVertical = isXhiroRoute(pathname)
    ? "xhiro"
    : LUXE_ROUTES.has(pathname)
      ? "luxe"
      : urlVertical ?? vertical;

  return (
    <div
      data-vertical={effectiveVertical}
      data-testid="vertical-theme-wrapper"
      className="min-h-screen bg-background text-foreground transition-colors duration-300"
    >
      {children}
    </div>
  );
};

export default VerticalThemeWrapper;
