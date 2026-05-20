import type { LucideIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PlaceholderChartPanelProps {
  title: string;
  icon: LucideIcon;
  hint: string;
  height: number;
}

export function PlaceholderChartPanel({
  title,
  icon: Icon,
  hint,
  height,
}: PlaceholderChartPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {title}
        </CardTitle>
        <span className="font-mono text-[10px] text-muted-foreground/60">{hint}</span>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height }}>
          <Skeleton className="absolute inset-0" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[11px] text-muted-foreground/60">
              Données non disponibles
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
