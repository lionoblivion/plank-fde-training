import { Suspense } from "react";
import type { Metadata } from "next";

import { AdminOverview } from "@/components/admin-overview";
import { listRequests } from "@/lib/requests";

export const metadata: Metadata = {
  title: "Обзор",
  description: "Обзорная панель администратора WorkBot.",
};

async function AdminOverviewData() {
  const requests = await listRequests();
  return <AdminOverview requests={requests} />;
}

export default function AdminOverviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Загрузка обзора…</p>
        }
      >
        <AdminOverviewData />
      </Suspense>
    </main>
  );
}
