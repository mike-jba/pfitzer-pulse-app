import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: "default" | "warning" | "danger" | "success";
}

const accentStyles = {
  default: "text-primary",
  warning: "text-amber-500",
  danger: "text-red-500",
  success: "text-emerald-500",
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trendLabel,
  accent = "default",
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", accentStyles[accent])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(subtitle || trendLabel) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {trendLabel ?? subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
