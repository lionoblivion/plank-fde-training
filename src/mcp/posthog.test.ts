import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPostHogApi,
  posthogServer,
  resolvePostHogApiHost,
  stripPostHogProps,
} from "./posthog";

describe("stripPostHogProps / resolvePostHogApiHost", () => {
  it("убирает $… properties", () => {
    expect(
      stripPostHogProps({
        requestId: "abc",
        $lib: "web",
        team: "ops",
      }),
    ).toEqual({ requestId: "abc", team: "ops" });
  });

  it("мапит capture host на API host", () => {
    expect(resolvePostHogApiHost("https://eu.i.posthog.com")).toBe(
      "https://eu.posthog.com",
    );
    expect(resolvePostHogApiHost("https://us.i.posthog.com/")).toBe(
      "https://us.posthog.com",
    );
    expect(resolvePostHogApiHost(undefined, "https://eu.posthog.com/")).toBe(
      "https://eu.posthog.com",
    );
  });
});

describe("posthog MCP server", () => {
  let client: Client;
  let server: McpServer;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/event_definitions/")) {
        return new Response(
          JSON.stringify({
            results: [
              { name: "request_form_viewed" },
              { name: "request_submitted" },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/events/")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                event: "request_submitted",
                distinct_id: "visitor-1",
                timestamp: "2026-11-23T12:00:00Z",
                properties: {
                  requestId: "req-1",
                  team: "operations",
                  $lib: "workbot",
                  $session_id: "sess",
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    });

    const api = createPostHogApi({
      projectId: "364664",
      personalKey: "phx_test",
      apiHost: "https://eu.posthog.com",
      fetch: fetchMock as unknown as typeof fetch,
    });

    server = posthogServer(api);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    client = new Client({ name: "posthog-test", version: "1.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("get-events строит URL и чистит $ properties", async () => {
    const result = await client.callTool({
      name: "get-events",
      arguments: {
        event: "request_submitted",
        distinctId: "visitor-1",
        after: "2026-11-23T11:00:00.000Z",
        limit: 10,
      },
    });

    expect(result.isError).toBeFalsy();
    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain(
      "https://eu.posthog.com/api/projects/364664/events/",
    );
    expect(calledUrl).toContain("event=request_submitted");
    expect(calledUrl).toContain("distinct_id=visitor-1");
    expect(calledUrl).toContain("after=");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: "Bearer phx_test",
      }),
    });

    const text = String(
      (result.content as { type: string; text: string }[])[0]?.text,
    );
    const rows = JSON.parse(text) as {
      event: string;
      properties: Record<string, unknown>;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.event).toBe("request_submitted");
    expect(rows[0]?.properties).toEqual({
      requestId: "req-1",
      team: "operations",
    });
    expect(rows[0]?.properties).not.toHaveProperty("$lib");
  });

  it("get-event-definitions возвращает имена", async () => {
    const result = await client.callTool({
      name: "get-event-definitions",
      arguments: {},
    });
    expect(result.isError).toBeFalsy();
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/event_definitions/");
    const names = JSON.parse(
      String((result.content as { type: string; text: string }[])[0]?.text),
    ) as string[];
    expect(names).toEqual(["request_form_viewed", "request_submitted"]);
  });

  it("check-event-fired отвечает одной фразой", async () => {
    const yes = await client.callTool({
      name: "check-event-fired",
      arguments: { event: "request_submitted", minutes: 10 },
    });
    expect(yes.isError).toBeFalsy();
    const yesText = String(
      (yes.content as { type: string; text: string }[])[0]?.text,
    );
    expect(yesText).toMatch(/^Yes:/);

    fetchMock.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const no = await client.callTool({
      name: "check-event-fired",
      arguments: { event: "request_viewed", minutes: 5 },
    });
    const noText = String(
      (no.content as { type: string; text: string }[])[0]?.text,
    );
    expect(noText).toMatch(/^No:/);
  });
});
