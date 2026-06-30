import { cn } from "@/lib/utils";

interface Props {
  confidence: number;
  className?: string;
}

export function confidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 85) return "high";
  if (confidence >= 60) return "medium";
  return "low";
}

const ConfidenceBadge = ({ confidence, className }: Props) => {
  const level = confidenceLevel(confidence);
  const colors = {
    high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    low: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        colors[level],
        className,
      )}
    >
      {Math.round(confidence)}%
    </span>
  );
};

export default ConfidenceBadge;
