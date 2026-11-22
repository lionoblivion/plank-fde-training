import { io } from "next/cache";
import { z } from "zod";

import { priorities, statuses, teams } from "@/lib/request-options";

export {
  priorities,
  priorityLabels,
  statusLabels,
  statuses,
  teamLabels,
  teams,
} from "@/lib/request-options";

/** Схема полей формы / API (без id и статуса). */
export const requestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Укажите заголовок")
    .max(120, "Заголовок слишком длинный"),
  details: z.string().trim().max(5000, "Описание слишком длинное").default(""),
  team: z.enum(teams, { error: "Выберите команду" }),
  priority: z
    .enum(priorities, { error: "Выберите приоритет" })
    .default("medium"),
});

/** Полная заявка в хранилище. */
export const workRequestSchema = requestSchema.extend({
  id: z.string().uuid(),
  status: z.enum(statuses).default("open"),
  createdAt: z.date(),
});

export type Request = z.infer<typeof requestSchema>;
export type WorkRequest = z.infer<typeof workRequestSchema>;

const STORE_KEY = "__workbot_requests__";

type GlobalWithRequests = typeof globalThis & {
  [STORE_KEY]?: WorkRequest[];
};

function getStore(): WorkRequest[] {
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

export function createRequest(input: unknown): WorkRequest {
  const fields = requestSchema.parse(input);
  const request = workRequestSchema.parse({
    ...fields,
    id: crypto.randomUUID(),
    status: "open",
    createdAt: new Date(),
  });
  getStore().push(request);
  return request;
}

/** Список заявок, новые сверху. io() помечает чтение как request-time. */
export async function listRequests(): Promise<WorkRequest[]> {
  await io();
  return [...getStore()].reverse();
}
