import { Suspense } from "react";
import type { Metadata } from "next";

import { RequestsFilters } from "@/components/requests-filters";
import { RequestsTable } from "@/components/requests-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listRequests, parseRequestFilters } from "@/lib/requests";

export const metadata: Metadata = {
  title: "Заявки",
  description: "Список заявок WorkBot.",
};

type RequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function RequestsList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseRequestFilters(params);
  const requests = await listRequests(filters);

  return (
    <div className="flex flex-col gap-6">
      <RequestsFilters filters={filters} />
      <RequestsTable requests={requests} />
    </div>
  );
}

export default function RequestsPage({ searchParams }: RequestsPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Заявки</CardTitle>
          <CardDescription>
            Новые заявки сверху. Фильтры по команде и статусу — ссылки в адресе.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Загрузка заявок…</p>
            }
          >
            <RequestsList searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
