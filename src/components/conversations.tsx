"use client";

import { use, useState, useSyncExternalStore } from "react";
import { io } from "next/cache";

import { Chat } from "@/components/chat";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  getConversations,
  getServerConversations,
  subscribe,
} from "@/lib/conversations";
import { cn } from "cn";

/**
 * Список бесед (sidebar / select) + открытый чат.
 * use(io()) до crypto.randomUUID — id не попадает в prerender HTML.
 */
export function Conversations() {
  use(io());

  const conversations = useSyncExternalStore(
    subscribe,
    getConversations,
    getServerConversations,
  );

  // Id «чистого» нового чата до первого ответа (не в localStorage)
  const [draftId] = useState(() => crypto.randomUUID());
  // Явный выбор пользователя (список / Новый чат)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? conversations[0]?.id ?? draftId;
  const activeInList = conversations.some((item) => item.id === activeId);

  function startNewChat() {
    setSelectedId(crypto.randomUUID());
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
      {/* Телефон: select + кнопка */}
      <div className="flex items-center gap-2 md:hidden">
        <NativeSelect
          className="min-w-0 flex-1"
          value={activeId}
          aria-label="Беседы"
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {!activeInList ? (
            <NativeSelectOption value={activeId}>Новый чат</NativeSelectOption>
          ) : null}
          {conversations.map((item) => (
            <NativeSelectOption key={item.id} value={item.id}>
              {item.title}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="button" variant="outline" onClick={startNewChat}>
          Новый чат
        </Button>
      </div>

      {/* Desktop: боковая колонка */}
      <aside className="hidden w-52 shrink-0 flex-col gap-2 md:flex">
        <Button type="button" onClick={startNewChat}>
          Новый чат
        </Button>
        <nav aria-label="Беседы" className="flex flex-col gap-1">
          {!activeInList ? (
            <span className="rounded-lg bg-muted px-2.5 py-1.5 text-sm font-medium">
              Новый чат
            </span>
          ) : null}
          {conversations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                item.id === activeId
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span className="line-clamp-2">{item.title}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <Chat key={activeId} conversationId={activeId} />
      </div>
    </div>
  );
}
