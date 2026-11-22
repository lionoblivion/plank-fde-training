import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Обзор",
  description: "Обзорная панель администратора WorkBot.",
};

export default function AdminOverviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
        <p className="text-sm text-muted-foreground">
          Сводка по заявкам появится здесь на следующем шаге.
        </p>
      </div>
    </main>
  );
}
