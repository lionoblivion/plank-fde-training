import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export type PostHogFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type PostHogApiOptions = {
  projectId: string;
  personalKey: string;
  /** App API host, напр. https://eu.posthog.com (не i.posthog.com) */
  apiHost: string;
  fetch?: PostHogFetch;
};

/** Клиент PostHog project API (Bearer personal key). */
export type PostHogApi = {
  getEvents: (params: {
    event?: string;
    distinctId?: string;
    after?: string;
    limit?: number;
  }) => Promise<{ results: Record<string, unknown>[] }>;
  getEventDefinitions: () => Promise<{ results: { name: string }[] }>;
};

function toolText(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          typeof payload === "string"
            ? payload
            : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function toolError(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

/** Убираем служебные $… свойства PostHog из properties события. */
export function stripPostHogProps(
  properties: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!properties || typeof properties !== "object") {
    return {};
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!key.startsWith("$")) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Capture host (eu.i.posthog.com) → API host (eu.posthog.com).
 * Или явный POSTHOG_API_HOST.
 */
function assertHttpsHost(raw: string, fallback: string): string {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") {
      return fallback;
    }
    return raw.replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export function resolvePostHogApiHost(
  captureHost?: string,
  apiHost?: string,
): string {
  if (apiHost) {
    return assertHttpsHost(apiHost, "https://us.posthog.com");
  }
  const raw = (captureHost ?? "https://us.i.posthog.com").replace(/\/$/, "");
  if (raw.includes("eu.i.posthog.com") || raw.includes("eu.posthog.com")) {
    return "https://eu.posthog.com";
  }
  if (raw.includes("us.i.posthog.com") || raw.includes("us.posthog.com")) {
    return "https://us.posthog.com";
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") {
      return "https://us.posthog.com";
    }
    const host = url.host.replace(/^([a-z0-9-]+)\.i\./, "$1.");
    return `https://${host}`;
  } catch {
    return "https://us.posthog.com";
  }
}

export function createPostHogApi(options: PostHogApiOptions): PostHogApi {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const base = options.apiHost.replace(/\/$/, "");
  const projectId = options.projectId;

  async function request(
    path: string,
    search: Record<string, string | undefined> = {},
  ): Promise<unknown> {
    const url = new URL(`${base}/api/projects/${projectId}${path}`);
    for (const [key, value] of Object.entries(search)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${options.personalKey}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `PostHog API ${response.status}: ${text.slice(0, 200) || response.statusText}`,
      );
    }
    return response.json();
  }

  return {
    async getEvents(params) {
      const data = (await request("/events/", {
        event: params.event,
        distinct_id: params.distinctId,
        after: params.after,
        limit: String(params.limit ?? 100),
      })) as { results?: Record<string, unknown>[] };
      return { results: data.results ?? [] };
    },
    async getEventDefinitions() {
      const data = (await request("/event_definitions/", {
        limit: "250",
      })) as { results?: { name: string }[] };
      return { results: data.results ?? [] };
    },
  };
}

/**
 * MCP-сервер над PostHog API: get-events, get-event-definitions, check-event-fired.
 */
export function posthogServer(api: PostHogApi): McpServer {
  const server = new McpServer({
    name: "posthog",
    version: "1.0.0",
  });

  server.registerTool(
    "get-events",
    {
      description:
        "Список событий PostHog с фильтрами event, distinct_id (visitor) и after (ISO). Без $… properties.",
      inputSchema: z.object({
        event: z.string().optional().describe("Имя события"),
        distinctId: z
          .string()
          .optional()
          .describe("distinct_id / cookie visitor"),
        after: z
          .string()
          .optional()
          .describe("ISO timestamp — только события после"),
        minutes: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Альтернатива after: окно в минутах от сейчас"),
        limit: z.number().int().positive().max(100).optional(),
      }),
    },
    async ({ event, distinctId, after, minutes, limit }) => {
      try {
        const afterIso =
          after ??
          (minutes
            ? new Date(Date.now() - minutes * 60_000).toISOString()
            : undefined);
        const { results } = await api.getEvents({
          event,
          distinctId,
          after: afterIso,
          limit,
        });
        const cleaned = results.map((row) => {
          const props = stripPostHogProps(
            row.properties as Record<string, unknown> | undefined,
          );
          return {
            event: row.event,
            distinct_id: row.distinct_id,
            timestamp: row.timestamp,
            properties: props,
          };
        });
        return toolText(cleaned);
      } catch (error) {
        return toolError(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  );

  server.registerTool(
    "get-event-definitions",
    {
      description: "Имена событий, которые PostHog уже видел в проекте",
    },
    async () => {
      try {
        const { results } = await api.getEventDefinitions();
        const names = results.map((row) => row.name).sort();
        return toolText(names);
      } catch (error) {
        return toolError(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  );

  server.registerTool(
    "check-event-fired",
    {
      description:
        "Одной фразой: было ли событие в последние N минут (по умолчанию 10)",
      inputSchema: z.object({
        event: z.string().describe("Имя события"),
        minutes: z.number().int().positive().optional().default(10),
        distinctId: z.string().optional(),
      }),
    },
    async ({ event, minutes = 10, distinctId }) => {
      try {
        const after = new Date(Date.now() - minutes * 60_000).toISOString();
        const { results } = await api.getEvents({
          event,
          distinctId,
          after,
          limit: 1,
        });
        if (results.length > 0) {
          const rawTs = String(results[0]?.timestamp ?? "");
          // Только ISO-подобная метка — без сырого текста из API в ответ модели
          const ts = /^\d{4}-\d{2}-\d{2}T/.test(rawTs) ? rawTs : "unknown time";
          return toolText(
            `Yes: "${event}" was captured in the last ${minutes} minutes (latest at ${ts}).`,
          );
        }
        return toolText(
          `No: "${event}" was not captured in the last ${minutes} minutes.`,
        );
      } catch (error) {
        return toolError(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  );

  return server;
}
