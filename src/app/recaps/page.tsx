import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function RecapsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-primary" />
            Daily Recaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">Daily Recaps — Coming in Chunk 11</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Automatically generated daily and weekly summaries delivered to Karen and Garret.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
