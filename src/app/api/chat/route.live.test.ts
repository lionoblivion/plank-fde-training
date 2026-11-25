import { describe, expect, it } from "vitest";

import { POST } from "./route";

/**
 * Live: маленькая модель через CHAT_MODEL / Groq.
 * Ищем calculator tool-call в UI message stream.
 */
describe("POST /api/chat live", () => {
  it("считает через calculator в stream", async () => {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY нужен для pnpm test:live");
    }

    // Live suite: маленькая/default Groq модель
    process.env.CHAT_PROVIDER = "groq";
    process.env.CHAT_MODEL = process.env.CHAT_MODEL ?? "openai/gpt-oss-120b";

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "live_calc",
          messages: [
            {
              id: "u1",
              role: "user",
              parts: [
                {
                  type: "text",
                  text: "What is 1234 * 5678? Use the calculator tool. After the tool, reply with only the number.",
                },
              ],
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body.toLowerCase()).toMatch(/calculator/);
    expect(body.replace(/[\s,]/g, "")).toMatch(/7006652/);
  }, 180_000);
});
