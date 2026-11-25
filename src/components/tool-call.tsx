"use client";

import { useState } from "react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { getToolName } from "ai";

import { cn } from "cn";

type ToolPart = ToolUIPart | DynamicToolUIPart;

type ToolCallProps = {
  part: ToolPart;
};

function stateLabel(state: ToolPart["state"]): string {
  switch (state) {
    case "input-streaming":
      return "Ввод…";
    case "input-available":
      return "Запуск…";
    case "output-available":
      return "Готово";
    case "output-error":
      return "Ошибка";
    case "approval-requested":
      return "Нужно подтверждение";
    case "approval-responded":
      return "Подтверждение отправлено";
    case "output-denied":
      return "Отклонено";
    default:
      return state;
  }
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Collapsible-панель вызова инструмента по состоянию part.state. */
export function ToolCall({ part }: ToolCallProps) {
  const name = getToolName(part);
  const running =
    part.state === "input-streaming" || part.state === "input-available";
  const [open, setOpen] = useState(running);

  const showInput =
    part.state === "input-streaming" ||
    part.state === "input-available" ||
    part.state === "output-available" ||
    part.state === "output-error";

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border bg-muted/30 text-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="font-mono text-xs font-medium">{name}</span>
        <span
          className={cn(
            "text-xs text-muted-foreground",
            part.state === "output-error" && "text-destructive",
            running && "animate-pulse",
          )}
        >
          {stateLabel(part.state)}
        </span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-3 py-2">
          {showInput && "input" in part && part.input !== undefined ? (
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Вход</div>
              <pre className="overflow-x-auto rounded bg-background/80 p-2 font-mono text-xs">
                {formatJson(part.input)}
              </pre>
            </div>
          ) : null}
          {part.state === "output-available" ? (
            <div>
              <div className="mb-1 text-xs text-muted-foreground">
                Результат
              </div>
              <pre className="overflow-x-auto rounded bg-background/80 p-2 font-mono text-xs">
                {formatJson(part.output)}
              </pre>
            </div>
          ) : null}
          {part.state === "output-error" ? (
            <div className="text-destructive">
              {"errorText" in part ? part.errorText : "Ошибка инструмента"}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
