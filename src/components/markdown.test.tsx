import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown } from "./markdown";

describe("Markdown", () => {
  it("рендерит жирный текст и code fence", () => {
    const html = renderToStaticMarkup(
      <Markdown>{"Ответ: **4**\n\n```js\nconst x = 1\n```"}</Markdown>,
    );
    expect(html).toContain("<strong>4</strong>");
    expect(html).toContain("data-code-block");
    expect(html).toContain("Копировать");
    expect(html).toContain("hljs-keyword");
    expect(html).toContain(">const<");
    expect(html).toContain("hljs-number");
  });
});
