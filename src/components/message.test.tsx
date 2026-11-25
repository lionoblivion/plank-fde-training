import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";

import { Message } from "./message";

describe("Message", () => {
  it("рисует user bubble с текстом", () => {
    const message: UIMessage = {
      id: "u1",
      role: "user",
      parts: [{ type: "text", text: "Сколько будет 2+2?" }],
    };
    const html = renderToStaticMarkup(<Message message={message} />);
    expect(html).toContain("Сколько будет 2+2?");
    expect(html).toContain("bg-primary");
  });

  it("рисует assistant Markdown и ToolCall", () => {
    const message: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        {
          type: "tool-calculator",
          toolCallId: "call_1",
          state: "output-available",
          input: { expression: "2+2" },
          output: { value: 4 },
        },
        { type: "text", text: "Ответ: **4**" },
      ],
    };
    const html = renderToStaticMarkup(<Message message={message} />);
    expect(html).toContain("calculator");
    expect(html).toContain("Готово");
    expect(html).toContain("<strong>4</strong>");
  });
});
