"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import { Message } from "@/components/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getConversations, upsertConversation } from "@/lib/conversations";

type ChatProps = {
  /** Id беседы; снаружи key={id} — remount при смене. */
  conversationId: string;
};

/** Клиентский чат поверх POST /api/chat для одной беседы. */
export function Chat({ conversationId }: ChatProps) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const sendingRef = useRef(false);
  const prevStatus = useRef<string>("ready");

  const initialMessages = useMemo(() => {
    return (
      getConversations().find((item) => item.id === conversationId)?.messages ??
      []
    );
  }, [conversationId]);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const pending = status === "submitted";
  const streaming = status === "streaming";

  // Сохраняем беседу один раз за ответ — когда status снова ready
  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;
    const finished =
      (prev === "submitted" || prev === "streaming") && status === "ready";
    if (!finished || messages.length === 0) return;
    upsertConversation({ id: conversationId, messages });
  }, [status, messages, conversationId]);

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
    stickToBottom.current = true;

    try {
      await sendMessage({ text });
    } catch {
      setInput(text);
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
