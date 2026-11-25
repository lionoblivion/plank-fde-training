import { describe, expect, it } from "vitest";

import { chatTools } from "@/lib/chat";
import "@/lib/tools";

describe("chatTools", () => {
  it("мапит calculator из реестра Day 7", () => {
    const tools = chatTools();
    expect(tools.calculator).toBeDefined();
    expect(tools.read_url).toBeDefined();
    expect(tools.save_note).toBeDefined();
  });
});
