/**
 * Stdio-entry MCP PostHog: personal key + project id из .env.local.
 * node --env-file-if-exists=.env.local --import tsx mcp/posthog.ts
 *
 * process.env здесь намеренно: отдельный Node-процесс вне Next, без бандла config.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  createPostHogApi,
  posthogServer,
  resolvePostHogApiHost,
} from "../src/mcp/posthog";

async function main(): Promise<void> {
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  const personalKey = process.env.POSTHOG_PERSONAL_KEY?.trim();

  if (!projectId || !personalKey) {
    console.error(
      "posthog MCP: POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_KEY are required",
    );
    process.exit(1);
  }

  const apiHost = resolvePostHogApiHost(
    process.env.POSTHOG_HOST,
    process.env.POSTHOG_API_HOST,
  );

  // fetch по умолчанию — реальный; тест передаёт fake через createPostHogApi
  const api = createPostHogApi({
    projectId,
    personalKey,
    apiHost,
  });

  const server = posthogServer(api);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
