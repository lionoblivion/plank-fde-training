import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  it("возвращает ok и database при доступной in-memory БД", async () => {
    const response = await GET();
    const json = (await response.json()) as {
      status: string;
      commit: string;
      database: string;
    };

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.database).toBe("ok");
    expect(typeof json.commit).toBe("string");
  });
});
