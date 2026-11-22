import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RequestsFilters } from "./requests-filters";

describe("RequestsFilters", () => {
  it("рендерит ряды ссылок команды и статуса", () => {
    const html = renderToStaticMarkup(<RequestsFilters filters={{}} />);

    expect(html).toContain("Команда");
    expect(html).toContain("Статус");
    expect(html).toContain("Операции");
    expect(html).toContain("Финансы");
    expect(html).toContain("Поддержка");
    expect(html).toContain("Открыта");
    expect(html).toContain("В работе");
    expect(html).toContain("Готово");
    expect(html).toContain('href="/requests?team=operations"');
    expect(html).toContain('href="/requests?status=open"');
  });

  it("сохраняет второй фильтр в href и помечает активный", () => {
    const html = renderToStaticMarkup(
      <RequestsFilters filters={{ team: "finance", status: "in_progress" }} />,
    );

    expect(html).toContain(
      'href="/requests?team=finance&amp;status=in_progress"',
    );
    expect(html).toContain('href="/requests?status=in_progress"');
    expect(html).toContain('href="/requests?team=finance"');
    expect(html).toContain('aria-current="page"');
  });
});
