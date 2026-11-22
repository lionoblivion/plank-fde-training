import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RequestStatusActions } from "./request-status-actions";
import type { WorkRequest } from "@/lib/requests";

function makeRequest(
  overrides: Partial<WorkRequest> & Pick<WorkRequest, "status">,
): WorkRequest {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Тестовая заявка",
    details: "",
    team: "operations",
    priority: "medium",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("RequestStatusActions", () => {
  it("для open показывает кнопки «В работе» и «Готово», без «Открыта»", () => {
    const html = renderToStaticMarkup(
      <RequestStatusActions request={makeRequest({ status: "open" })} />,
    );

    expect(html).toContain("В работе");
    expect(html).toContain("Готово");
    expect(html).not.toContain(">Открыта<");
  });

  it("для in_progress показывает «Открыта» и «Готово»", () => {
    const html = renderToStaticMarkup(
      <RequestStatusActions request={makeRequest({ status: "in_progress" })} />,
    );

    expect(html).toContain("Открыта");
    expect(html).toContain("Готово");
    expect(html).not.toContain(">В работе<");
  });
});
