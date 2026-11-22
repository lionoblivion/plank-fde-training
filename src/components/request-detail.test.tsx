import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RequestDetail } from "./request-detail";
import type { WorkRequest } from "@/lib/requests";

const sample: WorkRequest = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Нужен доступ",
  details: "К VPN",
  team: "operations",
  priority: "high",
  status: "open",
  createdAt: new Date("2026-01-01T12:00:00.000Z"),
};

describe("RequestDetail", () => {
  it("показывает заявку целиком с badges команды, приоритета и статуса", () => {
    const html = renderToStaticMarkup(<RequestDetail request={sample} />);

    expect(html).toContain("Нужен доступ");
    expect(html).toContain("К VPN");
    expect(html).toContain("Операции");
    expect(html).toContain("Высокий");
    expect(html).toContain("Открыта");
    expect(html).toContain("Создана:");
    expect(html).toContain('href="/requests"');
  });

  it("показывает заглушку, если описание пустое", () => {
    const html = renderToStaticMarkup(
      <RequestDetail request={{ ...sample, details: "" }} />,
    );

    expect(html).toContain("Описание не указано.");
  });
});
