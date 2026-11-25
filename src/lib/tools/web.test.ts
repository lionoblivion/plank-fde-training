import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

import {
  assertSafeUrl,
  isBlockedIp,
  readPage,
  searchWeb,
} from "@/lib/tools/web";

describe("SSRF guards", () => {
  it("блокирует частные и CGNAT IPv4", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("10.0.0.1")).toBe(true);
    expect(isBlockedIp("192.168.1.1")).toBe(true);
    expect(isBlockedIp("169.254.1.1")).toBe(true);
    expect(isBlockedIp("100.64.0.1")).toBe(true);
    expect(isBlockedIp("8.8.8.8")).toBe(false);
  });

  it("отклоняет localhost и .internal в URL", async () => {
    await expect(assertSafeUrl("http://localhost/x")).rejects.toThrow();
    await expect(assertSafeUrl("http://svc.internal/x")).rejects.toThrow();
    await expect(assertSafeUrl("ftp://example.com")).rejects.toThrow();
  });
});

describe("readPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("извлекает текст и не отдаёт HTML", async () => {
    const html =
      "<html><head><style>a{}</style><script>1</script></head>" +
      "<body><p>Hello <b>world</b></p></body></html>";
    const fetchMock = vi.fn(async () => {
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    });

    const result = await readPage("https://example.com/doc", fetchMock);
    expect(result.text).toContain("Hello");
    expect(result.text).toContain("world");
    expect(result.text).not.toMatch(/<p>|<script>/i);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/doc",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("проверяет Location на redirect", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: "https://example.com/final" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("ok text", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
      );

    const result = await readPage("https://example.com/start", fetchMock);
    expect(result.url).toBe("https://example.com/final");
    expect(result.text).toContain("ok text");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("searchWeb", () => {
  it("шлёт POST к Tavily с Bearer и нормализует ответ", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        expect(String(url)).toBe("https://api.tavily.com/search");
        expect(init?.method).toBe("POST");
        const headers = new Headers(init?.headers);
        expect(headers.get("Authorization")).toBe("Bearer tavily-test-key");
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(JSON.parse(String(init?.body))).toEqual({
          query: "workbot",
          max_results: 5,
        });
        return Response.json({
          results: [
            {
              title: "WorkBot",
              url: "https://example.com",
              content: "ops assistant",
            },
          ],
        });
      },
    );

    const results = await searchWeb("workbot", {
      apiKey: "tavily-test-key",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(results).toEqual([
      {
        title: "WorkBot",
        url: "https://example.com",
        description: "ops assistant",
      },
    ]);
  });

  it("не включает ключ в сообщение об ошибке", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 401 }));
    await expect(
      searchWeb("x", {
        apiKey: "super-secret-key",
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/HTTP 401/);
    await expect(
      searchWeb("x", {
        apiKey: "super-secret-key",
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.not.toThrow(/super-secret-key/);
  });
});
