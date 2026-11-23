import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/** Подгружает .env.local в process.env (только для smoke). */
function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();
const groqApiKey = process.env.GROQ_API_KEY;

describe.skipIf(!groqApiKey)("groq live smoke", () => {
  it("stream печатает ответ от openai/gpt-oss-120b", async () => {
    const { groq } = await import("./providers");
    const chunks: string[] = [];
    // apiKey явно: config мог уже закешироваться без GROQ_API_KEY
    const usage = await groq({ apiKey: groqApiKey }).stream(
      {
        messages: [
          {
            role: "user",
            content: "Reply with exactly: hello from groq",
          },
        ],
        maxTokens: 64,
        effort: "low",
      },
      (text) => {
        chunks.push(text);
        process.stdout.write(text);
      },
    );
    process.stdout.write("\n");

    const reply = chunks.join("");
    expect(reply.toLowerCase()).toContain("hello");
    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(usage.outputTokens).toBeGreaterThan(0);
  }, 60_000);
});
