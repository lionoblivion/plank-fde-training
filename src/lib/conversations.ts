import type { UIMessage } from "ai";

const STORAGE_KEY = "workbot.conversations";

/** Константа для SSR / getServerSnapshot — один и тот же reference. */
const EMPTY_CONVERSATIONS: Conversation[] = [];

export type Conversation = {
  id: string;
  title: string;
  messages: UIMessage[];
  updatedAt: number;
};

const listeners = new Set<() => void>();

/** Кэш: тот же raw string → тот же массив (без лишних ререндеров). */
let cachedRaw: string | null = null;
let cachedList: Conversation[] = EMPTY_CONVERSATIONS;

function notify(): void {
  for (const listener of listeners) listener();
}

function readRaw(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeRaw(raw: string): boolean {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

function isUIMessage(value: unknown): value is UIMessage {
  return (
    value != null &&
    typeof value === "object" &&
    typeof (value as { role?: unknown }).role === "string" &&
    Array.isArray((value as { parts?: unknown }).parts)
  );
}

function isConversation(value: unknown): value is Conversation {
  if (value == null || typeof value !== "object") return false;
  const c = value as Partial<Conversation>;
  return (
    typeof c.id === "string" &&
    typeof c.title === "string" &&
    Array.isArray(c.messages) &&
    c.messages.every(isUIMessage) &&
    typeof c.updatedAt === "number"
  );
}

function parseList(raw: string | null): Conversation[] {
  if (raw == null) return EMPTY_CONVERSATIONS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isConversation)) {
      return EMPTY_CONVERSATIONS;
    }
    return parsed;
  } catch {
    return EMPTY_CONVERSATIONS;
  }
}

/** Подписка для useSyncExternalStore (+ storage из других вкладок). */
export function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onStoreChange);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** Snapshot на сервере и при гидрации — пустой список. */
export function getServerConversations(): Conversation[] {
  return EMPTY_CONVERSATIONS;
}

/** Snapshot в браузере: читает localStorage с кэшем по raw-строке. */
export function getConversations(): Conversation[] {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  cachedList = parseList(raw);
  return cachedList;
}

/** Пишет список в localStorage и уведомляет подписчиков. */
export function saveConversations(conversations: Conversation[]): void {
  const raw = JSON.stringify(conversations);
  if (!writeRaw(raw)) return;
  cachedRaw = raw;
  cachedList = conversations;
  notify();
}

/** Заголовок из первого пользовательского текста. */
export function titleFromMessages(messages: UIMessage[]): string {
  const user = messages.find((message) => message.role === "user");
  if (!user) return "Новый чат";
  const text = user.parts
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim()
    .replace(/\s+/g, " ");
  if (!text) return "Новый чат";
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

/**
 * Обновляет или добавляет беседу: title из первого вопроса,
 * беседа уходит в начало списка.
 */
export function upsertConversation(
  conversation: Omit<Conversation, "title" | "updatedAt"> & {
    title?: string;
    updatedAt?: number;
  },
): Conversation {
  const title =
    conversation.title?.trim() ||
    titleFromMessages(conversation.messages) ||
    "Новый чат";
  const next: Conversation = {
    id: conversation.id,
    title,
    messages: conversation.messages,
    updatedAt: conversation.updatedAt ?? Date.now(),
  };

  const list = getConversations().filter((item) => item.id !== next.id);
  list.unshift(next);
  saveConversations(list);
  return next;
}

/** Сброс кэша (тесты). */
export function resetConversationsCacheForTests(): void {
  cachedRaw = null;
  cachedList = EMPTY_CONVERSATIONS;
}
