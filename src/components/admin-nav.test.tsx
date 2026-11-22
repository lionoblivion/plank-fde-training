import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminNav } from "./admin-nav";

describe("AdminNav", () => {
  it("показывает ссылки на обзор и настройки админки", () => {
    const html = renderToStaticMarkup(<AdminNav />);

    expect(html).toContain("Админ");
    expect(html).toContain("Обзор");
    expect(html).toContain("Настройки");
    expect(html).toContain('href="/admin"');
    expect(html).toContain('href="/admin/settings"');
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="Админ-навигация"');
  });
});
