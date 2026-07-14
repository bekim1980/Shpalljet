import type { Location } from "react-router-dom";

export function buildCurrentPath(location: Location): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function resolveAuthReturnTo(
  location: Location,
  explicit?: string,
): string {
  if (explicit && explicit.startsWith("/")) return explicit;

  const stateFrom = (location.state as { from?: string } | null)?.from;
  if (stateFrom && stateFrom.startsWith("/")) return stateFrom;

  const redirectParam = new URLSearchParams(location.search).get("redirect");
  if (redirectParam) {
    try {
      const decoded = decodeURIComponent(redirectParam);
      if (decoded.startsWith("/")) return decoded;
    } catch {
      /* noop */
    }
  }

  if (location.pathname === "/login") {
    return "/";
  }

  return buildCurrentPath(location);
}
