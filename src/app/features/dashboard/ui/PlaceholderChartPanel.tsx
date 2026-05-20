import type { LucideIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PlaceholderChartPanelProps {
  title: string;
  icon: LucideIcon;
  hint: string;
}

export function PlaceholderChartPanel({
  title,
  icon: Icon,
  hint,
}: PlaceholderChartPanelProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {title}
        </CardTitle>
        <span className="font-mono text-[0.625rem] text-muted-foreground/60">{hint}</span>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="relative h-full">
          <Skeleton className="absolute inset-0" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[0.6875rem] text-muted-foreground/60">
              Données non disponibles
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
