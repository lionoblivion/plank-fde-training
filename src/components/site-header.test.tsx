import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("отображает бренд WorkBot и навигационные ссылки", () => {
    const html = renderToStaticMarkup(<SiteHeader />);

    expect(html).toContain("WorkBot");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/requests"');
    expect(html).toContain('href="/policies"');
    expect(html).toContain('href="/admin"');
    expect(html).toContain('href="/admin/settings"');
  });
});
