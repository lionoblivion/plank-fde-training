import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("показывает кнопки ко всем доступным разделам", () => {
    const html = renderToStaticMarkup(<Home />);

    for (const href of [
      "/chat",
      "/requests",
      "/policies",
      "/admin",
      "/admin/settings",
      "/api/health",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }

    expect(html).toContain("Чат");
    expect(html).toContain("Заявки");
    expect(html).toContain("Политики");
    expect(html).toContain("Админ");
    expect(html).toContain("Настройки");
    expect(html).toContain("Состояние");
  });
});
