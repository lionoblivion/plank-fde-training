import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { z } from "zod";

import { runToolCall } from "./tool-bridge";
import { tool } from "./tool-def";
import { registerDefaultTools, registerTool, resetToolRegistry } from "./tools";

beforeEach(() => {
  resetToolRegistry();
  registerTool(
    tool({
      name: "ping",
      description: "ping",
      input: z.object({ n: z.number() }),
      run: ({ n }) => ({ n }),
    }),
  );
});

afterEach(() => {
  resetToolRegistry();
  registerDefaultTools();
});

describe("runToolCall", () => {
  it("успех возвращает result без isError", async () => {
    const call = await runToolCall("ping", { n: 1 });
    expect(call).toEqual({
      name: "ping",
      input: { n: 1 },
      result: { n: 1 },
      isError: false,
    });
  });

  it("unknown tool → isError, не exception", async () => {
    const call = await runToolCall("nope", {});
    expect(call.isError).toBe(true);
    expect(String(call.result)).toMatch(/Unknown tool/);
  });

  it("невалидный input → isError", async () => {
    const call = await runToolCall("ping", { n: "x" });
    expect(call.isError).toBe(true);
  });
});
