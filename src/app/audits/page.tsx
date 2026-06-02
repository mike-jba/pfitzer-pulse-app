import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

export default function AuditsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Call Quality Audits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardCheck className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">Audit Module — Coming in Chunk 12</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Select agents and calls to run AI-powered quality audits against configurable rubrics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
