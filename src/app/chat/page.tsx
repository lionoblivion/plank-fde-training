import type { Metadata } from "next";
import { Suspense } from "react";

import { Conversations } from "@/components/conversations";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Чат",
  description: "Чат WorkBot с инструментами и Markdown-ответами.",
};

function ChatFallback() {
  return (
    <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
      Загрузка чата…
    </div>
  );
}

export default function ChatPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Чат</h1>
          <p className="text-sm text-muted-foreground">
            Стрим через /api/chat: текст как Markdown, вызовы tools — панелями.
            Беседы хранятся в браузере.
          </p>
        </div>
        <Suspense fallback={<ChatFallback />}>
          <Conversations />
        </Suspense>
      </main>
    </>
  );
}
