/** Premium black-and-gold auth design tokens (Tailwind class fragments). */

export const authPanelClass =
  "relative rounded-[28px] border border-gold/20 bg-black/55 backdrop-blur-2xl " +
  "shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset,0_0_40px_rgba(212,175,55,0.06)]";

export const authPanelCompactClass =
  "relative rounded-[24px] border border-gold/20 bg-black/55 backdrop-blur-2xl " +
  "shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_30px_rgba(212,175,55,0.05)]";

export const authOverlayClass =
  "bg-black/75 backdrop-blur-md supports-[backdrop-filter]:bg-black/65";

export const authInputClass =
  "pl-11 h-[52px] rounded-xl bg-white/[0.04] border border-white/10 text-white " +
  "placeholder:text-white/35 transition-[border-color,box-shadow,background-color] duration-200 " +
  "focus-visible:ring-2 focus-visible:ring-gold/35 focus-visible:border-gold/40 focus-visible:bg-white/[0.06] " +
  "[&:-webkit-autofill]:[-webkit-text-fill-color:rgb(255_255_255/0.95)] " +
  "[&:-webkit-autofill]:[box-shadow:0_0_0_1000px_rgb(12_12_12/0.96)_inset] " +
  "[&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_rgb(14_14_14/0.96)_inset] " +
  "[&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_rgb(16_16_16/0.98)_inset,_0_0_0_2px_rgb(212_175_55/0.35)]";

export const authLabelClass = "text-[13px] font-medium text-white/75";

export const authGoldButtonClass =
  "w-full h-[52px] rounded-xl font-semibold text-[15px] text-black " +
  "bg-gradient-to-r from-gold via-amber-400 to-gold-light " +
  "shadow-[0_4px_24px_rgba(212,175,55,0.25)] " +
  "hover:shadow-[0_6px_32px_rgba(212,175,55,0.38)] hover:brightness-105 " +
  "focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/80 " +
  "disabled:opacity-60 disabled:pointer-events-none " +
  "motion-reduce:transition-none transition-[box-shadow,filter] duration-200";

export const authLinkClass =
  "text-gold/90 hover:text-gold underline-offset-2 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 rounded-sm";

export const authViewTransitionClass =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300";

/** @deprecated Use authPanelClass — kept for gradual migration */
export const authCardClass = authPanelClass;

/** @deprecated Use authGoldButtonClass */
export const authCtaClass = authGoldButtonClass;
