import { z } from "zod";

/** Команды из брифа курса Plank Day 3. */
export const teams = ["operations", "finance", "support"] as const;

/** Уровни приоритета для badges и фильтров списка. */
export const priorities = ["low", "medium", "high"] as const;

/** Статусы заявки для списка и смены статуса. */
export const statuses = ["open", "in_progress", "done"] as const;

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

/** Подписи статусов для UI. */
export const statusLabels: Record<(typeof statuses)[number], string> = {
  open: "Открыта",
  in_progress: "В работе",
  done: "Готово",
};

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

/** Полная заявка. createdAt через coerce — строки из PGlite тоже ок. */
export const workRequestSchema = requestSchema.extend({
  id: z.string().uuid(),
  status: z.enum(statuses).default("open"),
  createdAt: z.coerce.date(),
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
  return query ? `/requests?${query}` : `/requests`;
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

/** Проверка UUID до обращения к БД. */
const uuidSchema = z.string().uuid();

export function isRequestId(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}
