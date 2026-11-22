import { beforeEach, describe, expect, it } from "vitest";

import { resetRequestStore } from "@/lib/requests";

import { GET, POST } from "./route";
import {
  createRequestResponseSchema,
  errorResponseSchema,
  listRequestsResponseSchema,
} from "./types";

describe("GET /api/requests", () => {
  beforeEach(() => {
    resetRequestStore();
  });

  it("возвращает пустой список", async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(listRequestsResponseSchema.parse(json)).toEqual({ requests: [] });
  });

  it("возвращает созданные заявки, новые сверху", async () => {
    await POST(
      new Request("http://localhost/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Первая",
          team: "operations",
        }),
      }),
    );
    await POST(
      new Request("http://localhost/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Вторая",
          team: "finance",
          priority: "high",
        }),
      }),
    );

    const response = await GET();
    const json = listRequestsResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(json.requests.map((item) => item.title)).toEqual([
      "Вторая",
      "Первая",
    ]);
    expect(json.requests[0]?.status).toBe("open");
  });
});

describe("POST /api/requests", () => {
  beforeEach(() => {
    resetRequestStore();
  });

  it("создаёт заявку и отвечает 201", async () => {
    const response = await POST(
      new Request("http://localhost/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "  Нужен доступ  ",
          details: "  К VPN  ",
          team: "support",
        }),
      }),
    );
    const json = createRequestResponseSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(json.request).toMatchObject({
      title: "Нужен доступ",
      details: "К VPN",
      team: "support",
      priority: "medium",
      status: "open",
    });
    expect(json.request.id).toBeTruthy();
    expect(json.request.createdAt).toBeTruthy();
  });

  it("отклоняет невалидные данные с 400", async () => {
    const response = await POST(
      new Request("http://localhost/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "   ",
          team: "legal",
        }),
      }),
    );
    const json = errorResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(json.error).toBe("Ошибка валидации");
    expect(json.details).toBeTruthy();
  });

  it("отклоняет некорректный JSON с 400", async () => {
    const response = await POST(
      new Request("http://localhost/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    const json = errorResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(json.error).toBe("Некорректный JSON");
  });
});
