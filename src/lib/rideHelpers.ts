const POPULAR_CITIES = ["prishtina", "prishtinë", "pristina", "skopje", "shkup", "tirana", "tiranë"];

export function isPopularRoute(from: string, to: string): boolean {
  const f = from.toLowerCase().trim();
  const t = to.toLowerCase().trim();
  return POPULAR_CITIES.some((c) => f.includes(c)) && POPULAR_CITIES.some((c) => t.includes(c));
}

export function isLeavingSoon(departureIso: string): boolean {
  const diffMs = new Date(departureIso).getTime() - Date.now();
  return diffMs > 0 && diffMs < 6 * 60 * 60 * 1000;
}

export function timeAgo(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function seatsBadgeVariant(seatsAvailable: number): {
  className: string;
  label: string;
} {
  if (seatsAvailable <= 1) {
    return { className: "bg-red-500/15 text-red-400 border-red-500/30", label: "seat left" };
  }
  if (seatsAvailable <= 3) {
    return { className: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "seats left" };
  }
  return { className: "", label: "seats" };
}
