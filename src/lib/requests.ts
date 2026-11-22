import { z } from "zod";

/** Команды из брифа курса Plank Day 3. */
export const teams = ["operations", "finance", "support"] as const;

/** Уровни приоритета для badges и фильтров списка. */
export const priorities = ["low", "medium", "high"] as const;

export const requestSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  details: z.string().trim().default(""),
  team: z.enum(teams),
  priority: z.enum(priorities).default("medium"),
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
