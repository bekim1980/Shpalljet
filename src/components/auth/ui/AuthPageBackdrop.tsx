import { Crown, Store, Home, Briefcase, BriefcaseBusiness } from "lucide-react";
import { cn } from "@/lib/utils";

const tiles = [
  { icon: Crown, gradient: "from-amber-700/40 via-amber-900/20 to-transparent", label: "LUXE" },
  { icon: Store, gradient: "from-blue-700/35 via-blue-900/20 to-transparent", label: "MARKET" },
  { icon: Home, gradient: "from-emerald-700/35 via-emerald-900/20 to-transparent", label: "RENT" },
  { icon: Briefcase, gradient: "from-violet-700/35 via-purple-900/20 to-transparent", label: "SERVICES" },
  { icon: BriefcaseBusiness, gradient: "from-rose-700/30 via-rose-900/15 to-transparent", label: "JOBS" },
  { icon: Store, gradient: "from-slate-700/30 via-slate-900/15 to-transparent", label: "SHPALLJET" },
];

/** Decorative homepage-style backdrop for the /login page. */
const AuthPageBackdrop = ({ className }: { className?: string }) => (
  <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(42_65%_55%/0.12),_transparent_50%),linear-gradient(180deg,_hsl(0_0%_5%)_0%,_hsl(220_28%_8%)_50%,_hsl(0_0%_3%)_100%)]" />
    <div className="absolute top-8 left-1/2 -translate-x-1/2 h-[280px] w-[480px] rounded-full bg-[hsl(42,65%,55%/0.1)] blur-[120px]" />
    <div className="absolute top-1/3 -left-16 h-56 w-56 rounded-full bg-[hsl(220,70%,50%/0.07)] blur-[100px]" />
    <div className="absolute bottom-1/4 -right-12 h-56 w-56 rounded-full bg-[hsl(260,60%,55%/0.06)] blur-[100px]" />

    <div className="absolute inset-x-0 top-[18%] flex justify-center opacity-30 blur-[1px] scale-[1.02]">
      <span className="font-display text-5xl sm:text-7xl font-bold text-gradient-gold tracking-wide">Shpalljet</span>
    </div>

    <div className="absolute inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-[38%] grid max-w-4xl grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full sm:w-[90%] opacity-[0.22]">
      {tiles.map(({ icon: Icon, gradient, label }) => (
        <div
          key={label}
          className={cn(
            "aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-br p-4 flex flex-col justify-between",
            gradient,
          )}
        >
          <Icon className="h-6 w-6 text-white/50" />
          <span className="text-[10px] font-semibold tracking-[0.25em] text-white/40">{label}</span>
        </div>
      ))}
    </div>

    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/55 to-black/80" />
  </div>
);

export default AuthPageBackdrop;
