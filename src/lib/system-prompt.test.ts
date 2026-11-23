import { describe, expect, it } from "vitest";

import { systemPrompt } from "@/lib/system-prompt";

describe("systemPrompt", () => {
  it("короче 200 слов и содержит 4 части на русском", () => {
    const words = systemPrompt.trim().split(/\s+/).length;
    expect(words).toBeLessThan(200);
    expect(systemPrompt).toMatch(/WorkBot/);
    expect(systemPrompt).toMatch(/Источники/);
    expect(systemPrompt).toMatch(/Безопасность/);
    expect(systemPrompt).toMatch(/Стиль/);
    expect(systemPrompt).toMatch(/документ/i);
    expect(systemPrompt).toMatch(/команд/i);
  });
});
