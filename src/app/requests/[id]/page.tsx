import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RequestDetail } from "@/components/request-detail";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequest } from "@/lib/requests";

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: RequestDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const request = await getRequest(id);

  if (!request) {
    return {
      title: "Заявка не найдена",
    };
  }

  return {
    title: request.title,
    description: "Детали заявки WorkBot.",
  };
}

async function RequestDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getRequest(id);

  if (!request) {
    notFound();
  }

  return <RequestDetail request={request} />;
}

export default function RequestDetailPage({ params }: RequestDetailPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Заявка</CardTitle>
          <CardDescription>
            Полные данные заявки: команда, приоритет и статус. Смена статуса —
            кнопками ниже.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Загрузка заявки…</p>
            }
          >
            <RequestDetailContent params={params} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
