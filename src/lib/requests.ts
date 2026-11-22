import { z } from "zod";

import { priorities, teams } from "@/lib/request-options";

export {
  priorities,
  priorityLabels,
  teamLabels,
  teams,
} from "@/lib/request-options";

export const requestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Укажите заголовок")
    .max(120, "Заголовок слишком длинный"),
  details: z
    .string()
    .trim()
    .max(5000, "Описание слишком длинное")
    .default(""),
  team: z.enum(teams, { error: "Выберите команду" }),
  priority: z
    .enum(priorities, { error: "Выберите приоритет" })
    .default("medium"),
});

export type Request = z.infer<typeof requestSchema>;

const STORE_KEY = "__workbot_requests__";

type GlobalWithRequests = typeof globalThis & {
  [STORE_KEY]?: Request[];
};

function getStore(): Request[] {
  const globalWithStore = globalThis as GlobalWithRequests;
  if (!globalWithStore[STORE_KEY]) {
    globalWithStore[STORE_KEY] = [];
  }
  return globalWithStore[STORE_KEY];
}

/** Очищает in-memory список. Нужен unit-тестам. */
export function resetRequestStore(): void {
  getStore().length = 0;
}

export function createRequest(input: unknown): Request {
  const request = requestSchema.parse(input);
  getStore().push(request);
  return request;
}

export function listRequests(): Request[] {
  return [...getStore()];
}
