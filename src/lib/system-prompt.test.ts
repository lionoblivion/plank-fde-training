import { describe, expect, it } from "vitest";

import { systemPrompt } from "@/lib/system-prompt";

describe("systemPrompt", () => {
  it("короче 200 слов и содержит 4 части", () => {
    const words = systemPrompt.trim().split(/\s+/).length;
    expect(words).toBeLessThan(200);
    expect(systemPrompt).toMatch(/WorkBot/);
    expect(systemPrompt).toMatch(/Sources/i);
    expect(systemPrompt).toMatch(/Safety/i);
    expect(systemPrompt).toMatch(/Style/i);
    expect(systemPrompt).toMatch(/document/i);
    expect(systemPrompt).toMatch(/team/i);
  });
});
