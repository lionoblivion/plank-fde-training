import { z } from "zod";

/** Команды из брифа курса Plank Day 3. */
export const teams = ["operations", "finance", "support"] as const;

/** Уровни приоритета для badges и фильтров списка. */
export const priorities = ["low", "medium", "high"] as const;

/** Подписи команд для UI. */
export const teamLabels: Record<(typeof teams)[number], string> = {
  operations: "Операции",
  finance: "Финансы",
  support: "Поддержка",
};

/** Подписи приоритетов для UI. */
export const priorityLabels: Record<(typeof priorities)[number], string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export const requestSchema = z.object({
  title: z.string().trim().min(1, "Укажите заголовок"),
  details: z.string().trim().default(""),
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
