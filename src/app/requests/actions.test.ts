import { beforeEach, describe, expect, it, vi } from "vitest";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { createRequestAction, setStatus } from "./actions";
import {
  createRequest,
  getRequest,
  listRequests,
  resetRequestStore,
} from "@/lib/requests";

vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return {
    ...actual,
    refresh: vi.fn(),
  };
});

import { refresh } from "next/cache";

function formDataFrom(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createRequestAction", () => {
  beforeEach(async () => {
    await resetRequestStore();
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

describe("setStatus", () => {
  beforeEach(async () => {
    await resetRequestStore();
    vi.mocked(refresh).mockClear();
  });

  it("обновляет статус и вызывает refresh", async () => {
    const created = await createRequest({
      title: "На смену статуса",
      team: "operations",
    });

    await setStatus(created.id, "in_progress");

    expect((await getRequest(created.id))?.status).toBe("in_progress");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("не пишет неизвестный статус", async () => {
    const created = await createRequest({
      title: "Защита enum",
      team: "finance",
    });

    await expect(setStatus(created.id, "closed")).rejects.toThrow();

    expect((await getRequest(created.id))?.status).toBe("open");
    expect(refresh).not.toHaveBeenCalled();
  });
});
