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

/** Заявка по id или undefined, если нет. io() — request-time чтение. */
export async function getRequest(id: string): Promise<WorkRequest | undefined> {
  await io();
  return getStore().find((request) => request.id === id);
}

export type StatusCounts = Record<(typeof statuses)[number], number>;

/** Считает заявки по каждому статусу (включая нули). */
export function countRequestsByStatus(requests: WorkRequest[]): StatusCounts {
  const counts: StatusCounts = {
    open: 0,
    in_progress: 0,
    done: 0,
  };
  for (const request of requests) {
    counts[request.status] += 1;
  }
  return counts;
}

/**
 * Меняет статус заявки. Статус проверяется по enum схемы до записи.
 * Бросает ZodError при неизвестном статусе и Error, если id не найден.
 */
export function updateRequestStatus(id: string, status: unknown): WorkRequest {
  const parsedStatus = z.enum(statuses).parse(status);
  const store = getStore();
  const index = store.findIndex((request) => request.id === id);
  if (index === -1) {
    throw new Error("Заявка не найдена");
  }
  const current = store[index];
  if (!current) {
    throw new Error("Заявка не найдена");
  }
  const updated = workRequestSchema.parse({
    ...current,
    status: parsedStatus,
  });
  store[index] = updated;
  return updated;
}
