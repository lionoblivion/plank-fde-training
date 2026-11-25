import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ToolUIPart } from "ai";

import { ToolCall } from "./tool-call";

describe("ToolCall", () => {
  it("показывает состояние ошибки", () => {
    const part = {
      type: "tool-calculator",
      toolCallId: "c1",
      state: "output-error",
      input: { expression: "1/0" },
      errorText: "Division by zero",
    } as ToolUIPart;

    const html = renderToStaticMarkup(<ToolCall part={part} />);
    expect(html).toContain("Ошибка");
    expect(html).toContain("calculator");
  });

  it("помечает input-streaming как Ввод…", () => {
    const part = {
      type: "tool-calculator",
      toolCallId: "c2",
      state: "input-streaming",
      input: { expression: "1" },
    } as ToolUIPart;

    const html = renderToStaticMarkup(<ToolCall part={part} />);
    expect(html).toContain("Ввод…");
  });
});
