import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("renders the WorkBot brand and navigation links", () => {
    const html = renderToStaticMarkup(<SiteHeader />);

    expect(html).toContain("WorkBot");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/settings"');
  });
});
