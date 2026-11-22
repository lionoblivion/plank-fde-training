import { beforeEach, describe, expect, it } from "vitest";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { createRequestAction } from "./actions";
import { listRequests, resetRequestStore } from "@/lib/requests";

function formDataFrom(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createRequestAction", () => {
  beforeEach(() => {
    resetRequestStore();
  });

  it("возвращает ошибки полей при невалидных данных", async () => {
    const state = await createRequestAction(
      {},
      formDataFrom({
        title: "   ",
        team: "",
      }),
    );

    expect(state.errors?.title?.[0]).toBeTruthy();
    expect(state.errors?.team?.[0]).toBeTruthy();
    expect(await listRequests()).toHaveLength(0);
  });

  it("создаёт заявку и делает redirect на /requests", async () => {
    let caught: unknown;
    try {
      await createRequestAction(
        {},
        formDataFrom({
          title: "  Нужен доступ  ",
          details: "  К VPN  ",
          team: "operations",
          priority: "high",
        }),
      );
    } catch (error) {
      caught = error;
    }

    expect(isRedirectError(caught)).toBe(true);

    const listed = await listRequests();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      title: "Нужен доступ",
      details: "К VPN",
      team: "operations",
      priority: "high",
      status: "open",
    });
  });
});
