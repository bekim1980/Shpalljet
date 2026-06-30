import { Card, CardContent } from "@/components/ui/card";
import { Package, Users, AlertTriangle, Clock } from "lucide-react";

interface StatsCardsProps {
  totalListings: number;
  totalUsers: number;
  totalReports: number;
  pendingModeration: number;
}

const StatsCards = ({ totalListings, totalUsers, totalReports, pendingModeration }: StatsCardsProps) => {
  const stats = [
    { label: "Listime totale", value: totalListings, icon: Package, color: "text-primary" },
    { label: "Përdorues", value: totalUsers, icon: Users, color: "text-accent-foreground" },
    { label: "Raporte", value: totalReports, icon: AlertTriangle, color: "text-destructive" },
    { label: "Në pritje", value: pendingModeration, icon: Clock, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`h-8 w-8 ${s.color} shrink-0`} />
            <div>
              <p className="text-2xl font-bold font-display">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
