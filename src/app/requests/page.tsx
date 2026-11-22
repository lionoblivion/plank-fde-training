import { Suspense } from "react";
import type { Metadata } from "next";

import { RequestsTable } from "@/components/requests-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listRequests } from "@/lib/requests";

export const metadata: Metadata = {
  title: "Заявки",
  description: "Список заявок WorkBot.",
};

async function RequestsList() {
  const requests = await listRequests();
  return <RequestsTable requests={requests} />;
}

export default function RequestsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Заявки</CardTitle>
          <CardDescription>
            Новые заявки сверху. Приоритет и статус показаны как badges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Загрузка заявок…</p>
            }
          >
            <RequestsList />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
