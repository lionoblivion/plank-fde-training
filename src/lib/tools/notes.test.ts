import { beforeEach, describe, expect, it } from "vitest";

import { resetDbConnection } from "@/lib/db";
import { saveNote } from "@/lib/tools/notes";
import { executeTool, getTool } from "@/lib/tools";

describe("saveNote", () => {
  beforeEach(() => {
    resetDbConnection();
  });

  it("сохраняет заметку и возвращает id/createdAt", async () => {
    const note = await saveNote("Первая заметка WorkBot");
    expect(note.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(note.body).toBe("Первая заметка WorkBot");
    expect(note.createdAt).toBeInstanceOf(Date);
  });

  it("tool save_note валидирует пустое тело", async () => {
    expect(getTool("save_note")).toBeDefined();
    await expect(executeTool("save_note", { body: "   " })).rejects.toThrow();
  });
});
