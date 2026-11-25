import { z } from "zod";

import { query } from "@/lib/db";
import { tool } from "@/lib/tool-def";

export type SavedNote = {
  id: string;
  body: string;
  createdAt: Date;
};

/** Сохраняет заметку через существующий query() Day 5. */
export async function saveNote(body: string): Promise<SavedNote> {
  const rows = await query(
    `insert into notes (body)
     values ($1)
     returning id, body, created_at`,
    [body],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("Failed to save note");
  }
  return {
    id: String(row.id),
    body: String(row.body),
    createdAt: new Date(String(row.created_at)),
  };
}

export const notesTool = tool({
  name: "save_note",
  description:
    "Сохраняет текстовую заметку в базу WorkBot (таблица notes). Вызывай, когда пользователь просит запомнить факт, вывод исследования или краткий итог для себя.",
  input: z.object({
    body: z
      .string()
      .trim()
      .min(1, "Пустая заметка")
      .max(4000, "Заметка слишком длинная")
      .describe("Текст заметки"),
  }),
  async run({ body }) {
    const note = await saveNote(body);
    return {
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
    };
  },
});
