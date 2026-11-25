import type { Metadata } from "next";

import { Chat } from "@/components/chat";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Чат",
  description: "Чат WorkBot с инструментами и Markdown-ответами.",
};

export default function ChatPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Чат</h1>
          <p className="text-sm text-muted-foreground">
            Стрим через /api/chat: текст как Markdown, вызовы tools — панелями.
          </p>
        </div>
        <Chat />
      </main>
    </>
  );
}
