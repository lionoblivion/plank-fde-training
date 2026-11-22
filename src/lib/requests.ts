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

/**
 * Query-фильтры списка. Неизвестные значения становятся undefined
 * (показываем полный список вместо ошибки).
 */
export const requestFiltersSchema = z.object({
  team: z.enum(teams).optional().catch(undefined),
  status: z.enum(statuses).optional().catch(undefined),
});

export type RequestFilters = z.infer<typeof requestFiltersSchema>;

/** Берёт первый query-параметр, если пришёл массив. */
function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/** Парсит searchParams страницы `/requests` без падения на мусоре. */
export function parseRequestFilters(
  searchParams: Record<string, string | string[] | undefined>,
): RequestFilters {
  return requestFiltersSchema.parse({
    team: firstSearchParam(searchParams.team),
    status: firstSearchParam(searchParams.status),
  });
}

/** Собирает href списка с текущими фильтрами. */
export function buildRequestsHref(filters: RequestFilters): string {
  const params = new URLSearchParams();
  if (filters.team) {
    params.set("team", filters.team);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  const query = params.toString();
  return query ? `/requests?${query}` : "/requests";
}

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
export async function listRequests(
  filters: RequestFilters = {},
): Promise<WorkRequest[]> {
  await io();
  let listed = [...getStore()].reverse();
  if (filters.team) {
    listed = listed.filter((request) => request.team === filters.team);
  }
  if (filters.status) {
    listed = listed.filter((request) => request.status === filters.status);
  }
  return listed;
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
