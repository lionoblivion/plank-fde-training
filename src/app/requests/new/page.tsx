import type { Metadata } from "next";

import { RequestForm } from "@/components/request-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Track } from "@/lib/analytics";

export const metadata: Metadata = {
  title: "Новая заявка",
  description: "Форма создания заявки WorkBot.",
};

export default function NewRequestPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <Track event="request_form_viewed" />
      <Card>
        <CardHeader>
          <CardTitle>Новая заявка</CardTitle>
          <CardDescription>
            Опишите задачу для команды. После отправки вы попадёте в список
            заявок.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestForm />
        </CardContent>
      </Card>
    </main>
  );
}
