import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Deployment environment and commit details for this WorkBot instance.",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Deployment details for this WorkBot instance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Environment</span>
            <Badge variant="secondary">{config.env}</Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Commit</span>
            <code className="font-mono text-sm">{config.commit}</code>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
