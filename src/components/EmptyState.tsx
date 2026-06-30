import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="flex flex-col items-center justify-center py-16 px-6 text-center"
  >
    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="font-display text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
    {action}
  </motion.div>
);

export default EmptyState;
