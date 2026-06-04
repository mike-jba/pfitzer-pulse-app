import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function TrendsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" />
            Call Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">Trends — Coming in Chunk 8</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pest activity trends, complaint spikes, agent performance over time, and more.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
