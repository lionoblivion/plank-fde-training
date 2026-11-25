"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "cn";

type CodeBlockProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Блок кода с кнопкой копирования.
 * Копируется textContent — без разметки подсветки.
 */
export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    const pre = event.currentTarget
      .closest("[data-code-block]")
      ?.querySelector("pre");
    const text = pre?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div data-code-block className="group relative my-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={handleCopy}
      >
        {copied ? "Скопировано" : "Копировать"}
      </Button>
      <pre
        className={cn(
          "overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-sm",
          className,
        )}
      >
        {children}
      </pre>
    </div>
  );
}
