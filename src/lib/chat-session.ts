import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

const STORAGE_KEY = "workbot.chat.messages";
const CHAT_ID = "workbot-ui";

export type WorkBotChat = Chat<UIMessage>;

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Минимальная проверка формы UIMessage
    const ok = parsed.every(
      (m) =>
        m != null &&
        typeof m === "object" &&
        typeof (m as { role?: unknown }).role === "string" &&
        Array.isArray((m as { parts?: unknown }).parts),
    );
    return ok ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

/** Сохраняет историю чата между remount / HMR. */
export function persistChatMessages(messages: UIMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // квота / private mode — игнорируем
  }
}

let browserChat: WorkBotChat | undefined;

/**
 * Один Chat на вкладку: remount React / Fast Refresh не обнуляет переписку
 * и не дергает stop() через cleanup useChat.
 */
export function getBrowserChat(): WorkBotChat {
  if (browserChat) return browserChat;

  browserChat = new Chat({
    id: CHAT_ID,
    messages: loadMessages(),
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  return browserChat;
}
