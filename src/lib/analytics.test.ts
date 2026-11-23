import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const afterMock = vi.fn(async (fn: () => void | Promise<void>) => {
  await fn();
});
const cookiesMock = vi.fn(async () => ({
  get: (name: string) =>
    name === "visitor" ? { value: "visitor-test-id" } : undefined,
}));

vi.mock("next/server", () => ({
  after: (fn: () => void | Promise<void>) => afterMock(fn),
  connection: async () => undefined,
}));

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

describe("track", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    afterMock.mockClear();
    cookiesMock.mockClear();
    fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    delete process.env.POSTHOG_KEY;
    delete process.env.POST_HOG_API;
    delete process.env.POSTHOG_HOST;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.POSTHOG_KEY;
    delete process.env.POST_HOG_API;
    delete process.env.POSTHOG_HOST;
  });

  it("без ключа ничего не отправляет", async () => {
    const { track } = await import("./analytics");
    await track("request_form_viewed");
    expect(afterMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("с ключом шлёт capture без PII", async () => {
    process.env.POSTHOG_KEY = "phc_test_key";
    process.env.POSTHOG_HOST = "https://example.posthog.test";

    const { track } = await import("./analytics");
    await track("request_submitted", {
      requestId: "11111111-1111-4111-8111-111111111111",
      team: "operations",
    });

    expect(afterMock).toHaveBeenCalledTimes(1);
    await afterMock.mock.results[0]?.value;
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.posthog.test/i/v0/e/",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const init = fetchMock.mock.calls[0]?.[1] as { body?: string } | undefined;
    const body = JSON.parse(String(init?.body)) as {
      api_key: string;
      distinct_id: string;
      event: string;
      properties: Record<string, unknown>;
    };
    expect(body.api_key).toBe("phc_test_key");
    expect(body.distinct_id).toBe("visitor-test-id");
    expect(body.event).toBe("request_submitted");
    expect(body.properties).toEqual({
      requestId: "11111111-1111-4111-8111-111111111111",
      team: "operations",
    });
    expect(JSON.stringify(body)).not.toMatch(/email|name|phone/i);
  });
});
