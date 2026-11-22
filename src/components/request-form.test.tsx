import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RequestForm } from "./request-form";

describe("RequestForm", () => {
  it("рендерит поля Input, Textarea и NativeSelect", () => {
    const html = renderToStaticMarkup(<RequestForm />);

    expect(html).toContain('name="title"');
    expect(html).toContain('name="details"');
    expect(html).toContain('name="team"');
    expect(html).toContain('name="priority"');
    expect(html).toContain("Создать заявку");
    expect(html).toContain("Операции");
    expect(html).toContain("Средний");
  });
});
