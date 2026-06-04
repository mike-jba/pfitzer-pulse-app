import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Settings className="h-4 w-4 text-primary" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Settings className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">Admin Settings — Coming in later chunks</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage agents, prompt configuration, category lists, and notification recipients.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
