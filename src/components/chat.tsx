"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useChat } from "@ai-sdk/react";

import { Message } from "@/components/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getBrowserChat,
  persistChatMessages,
  type WorkBotChat,
} from "@/lib/chat-session";

const emptySubscribe = () => () => {};

function ChatPanel({ chat }: { chat: WorkBotChat }) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const sendingRef = useRef(false);

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    chat,
  });

  const pending = status === "submitted";
  const streaming = status === "streaming";

  useEffect(() => {
    persistChatMessages(messages);
  }, [messages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < 80;
  }

  async function submit() {
    const text = (textareaRef.current?.value ?? input).trim();
    if (!text || status === "submitted" || status === "streaming") return;
    if (sendingRef.current) return;

    sendingRef.current = true;
    clearError();
    setInput("");
    if (textareaRef.current) textareaRef.current.value = "";
    stickToBottom.current = true;

    try {
      await sendMessage({ text });
    } catch {
      setInput(text);
      if (textareaRef.current) textareaRef.current.value = text;
    } finally {
      sendingRef.current = false;
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="flex h-[min(70vh,720px)] flex-col overflow-hidden rounded-xl border border-border bg-background">
      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Спросите WorkBot — например, «Сколько будет 1234 × 5678?»
          </p>
        ) : null}
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {pending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className="size-2 animate-pulse rounded-full bg-muted-foreground"
              aria-hidden
            />
            Думаю…
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}
      </div>

      <form
        className="flex flex-col gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onInput={(event) => setInput(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          placeholder="Сообщение… Enter — отправить, Shift+Enter — новая строка"
          rows={1}
          className="max-h-40 min-h-[2.75rem] resize-none"
        />
        <div className="flex items-center justify-end gap-2">
          {streaming ? (
            <Button type="button" variant="outline" onClick={() => stop()}>
              Стоп
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={status === "submitted" || status === "streaming"}
            onClick={() => void submit()}
          >
            Отправить
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Клиентский чат поверх POST /api/chat. */
export function Chat() {
  // Синглтон только в браузере; на SSR — null (без setState в effect)
  const chat = useSyncExternalStore(
    emptySubscribe,
    getBrowserChat,
    (): WorkBotChat | null => null,
  );

  if (!chat) {
    return (
      <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
        Загрузка чата…
      </div>
    );
  }

  return <ChatPanel chat={chat} />;
}
