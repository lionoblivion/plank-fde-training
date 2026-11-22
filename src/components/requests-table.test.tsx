import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RequestsTable } from "./requests-table";
import type { WorkRequest } from "@/lib/requests";

const sample: WorkRequest = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Нужен доступ",
  details: "К VPN",
  team: "operations",
  priority: "high",
  status: "open",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("RequestsTable", () => {
  it("показывает empty state и кнопку создания", () => {
    const html = renderToStaticMarkup(<RequestsTable requests={[]} />);

    expect(html).toContain("Заявок пока нет");
    expect(html).toContain('href="/requests/new"');
    expect(html).toContain("Новая заявка");
  });

  it("рендерит таблицу с badges приоритета и статуса", () => {
    const html = renderToStaticMarkup(<RequestsTable requests={[sample]} />);

    expect(html).toContain("Нужен доступ");
    expect(html).toContain(`href="/requests/${sample.id}"`);
    expect(html).toContain("Операции");
    expect(html).toContain("Высокий");
    expect(html).toContain("Открыта");
    expect(html).toContain('href="/requests/new"');
  });

  it("ведёт заголовок на страницу детали заявки", () => {
    const html = renderToStaticMarkup(<RequestsTable requests={[sample]} />);

    expect(html).toContain(`href="/requests/${sample.id}"`);
  });
});
