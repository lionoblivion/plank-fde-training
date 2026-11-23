import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminOverview } from "./admin-overview";
import type { WorkRequest } from "@/lib/request-model";

function makeRequest(
  overrides: Partial<WorkRequest> &
    Pick<WorkRequest, "id" | "title" | "status">,
): WorkRequest {
  return {
    details: "",
    team: "operations",
    priority: "medium",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("AdminOverview", () => {
  it("показывает карточки с количеством по каждому статусу", () => {
    const requests = [
      makeRequest({
        id: "11111111-1111-4111-8111-111111111111",
        title: "A",
        status: "open",
      }),
      makeRequest({
        id: "22222222-2222-4222-8222-222222222222",
        title: "B",
        status: "open",
      }),
      makeRequest({
        id: "33333333-3333-4333-8333-333333333333",
        title: "C",
        status: "in_progress",
      }),
      makeRequest({
        id: "44444444-4444-4444-8444-444444444444",
        title: "D",
        status: "done",
      }),
    ];

    const html = renderToStaticMarkup(<AdminOverview requests={requests} />);

    expect(html).toContain("Открыта");
    expect(html).toContain("В работе");
    expect(html).toContain("Готово");
    expect(html).toContain(">2<");
    expect(html).toContain(">1<");
  });

  it("показывает не больше пяти последних заявок", () => {
    const requests = Array.from({ length: 7 }, (_, index) =>
      makeRequest({
        id: `11111111-1111-4111-8111-11111111111${index}`,
        title: `Заявка ${index}`,
        status: "open",
      }),
    );

    const html = renderToStaticMarkup(<AdminOverview requests={requests} />);

    expect(html).toContain("Заявка 0");
    expect(html).toContain("Заявка 4");
    expect(html).not.toContain("Заявка 5");
    expect(html).not.toContain("Заявка 6");
  });

  it("показывает empty state без заявок", () => {
    const html = renderToStaticMarkup(<AdminOverview requests={[]} />);

    expect(html).toContain("Заявок пока нет");
    expect(html).toContain('href="/requests"');
    expect(html).toContain(">0<");
  });
});
