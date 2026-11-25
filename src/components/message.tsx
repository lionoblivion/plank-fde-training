"use client";

import type { UIMessage } from "ai";
import { isToolUIPart } from "ai";

import { Markdown } from "@/components/markdown";
import { ToolCall } from "@/components/tool-call";
import { cn } from "cn";

type MessageProps = {
  message: UIMessage;
};

/** Сообщение чата: bubble для user, Markdown + ToolCall для assistant. */
export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n");

    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground",
          )}
        >
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] space-y-1 text-sm">
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            if (!part.text.trim()) return null;
            return (
              <Markdown key={`${message.id}-text-${index}`}>
                {part.text}
              </Markdown>
            );
          }
          if (isToolUIPart(part)) {
            return <ToolCall key={`${message.id}-tool-${index}`} part={part} />;
          }
          // reasoning и прочие служебные parts не показываем в UI
          return null;
        })}
      </div>
    </div>
  );
}
