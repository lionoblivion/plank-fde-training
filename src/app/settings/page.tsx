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
  title: "Настройки",
  description:
    "Окружение развёртывания и сведения о коммите для этого экземпляра WorkBot.",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Настройки</CardTitle>
          <CardDescription>
            Сведения о развёртывании этого экземпляра WorkBot.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Окружение</span>
            <Badge variant="secondary">{config.env}</Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Коммит</span>
            <code className="font-mono text-sm">{config.commit}</code>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
