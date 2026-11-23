import { cache } from "react";
import { io } from "next/cache";
import { z } from "zod";

import { query } from "@/lib/db";
import {
  buildRequestsHref,
  countRequestsByStatus,
  isRequestId,
  parseRequestFilters,
  priorities,
  priorityLabels,
  requestFiltersSchema,
  requestSchema,
  statusLabels,
  statuses,
  teamLabels,
  teams,
  workRequestSchema,
  type Request,
  type RequestFilters,
  type StatusCounts,
  type WorkRequest,
} from "@/lib/request-model";

export {
  buildRequestsHref,
  countRequestsByStatus,
  parseRequestFilters,
  priorities,
  priorityLabels,
  requestFiltersSchema,
  requestSchema,
  statusLabels,
  statuses,
  teamLabels,
  teams,
  workRequestSchema,
  type Request,
  type RequestFilters,
  type StatusCounts,
  type WorkRequest,
};

/** Поля select в форме схемы WorkRequest (created_at → createdAt). */
const REQUEST_SELECT = `
  id,
  title,
  details,
  team,
  priority,
  status,
  created_at as "createdAt"
`;

function parseRow(row: Record<string, unknown>): WorkRequest {
  return workRequestSchema.parse(row);
}

/** Очищает таблицу заявок. Нужен unit-тестам. */
export async function resetRequestStore(): Promise<void> {
  await query("delete from requests");
}

export async function createRequest(input: unknown): Promise<WorkRequest> {
  const fields = requestSchema.parse(input);
  const rows = await query(
    `insert into requests (title, details, team, priority, status)
     values ($1, $2, $3, $4, 'open')
     returning ${REQUEST_SELECT}`,
    [fields.title, fields.details, fields.team, fields.priority],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("Не удалось создать заявку");
  }
  return parseRow(row);
}

/** Список заявок, новые сверху. io() помечает чтение как request-time. */
export async function listRequests(
  filters: RequestFilters = {},
): Promise<WorkRequest[]> {
  await io();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.team) {
    params.push(filters.team);
    clauses.push(`team = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
  const rows = await query(
    `select ${REQUEST_SELECT} from requests ${where}
     order by created_at desc, seq desc`,
    params,
  );
  return rows.map(parseRow);
}

/**
 * Заявка по id или undefined, если нет.
 * Не-UUID сразу not found — до SQL.
 * cache() — один запрос на request при metadata + page.
 */
export const getRequest = cache(
  async (id: string): Promise<WorkRequest | undefined> => {
    await io();
    if (!isRequestId(id)) {
      return undefined;
    }
    const rows = await query(
      `select ${REQUEST_SELECT} from requests where id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? parseRow(row) : undefined;
  },
);

/**
 * Меняет статус заявки. Статус проверяется по enum схемы до записи.
 * Бросает ZodError при неизвестном статусе и Error, если id не найден.
 */
export async function updateRequestStatus(
  id: string,
  status: unknown,
): Promise<WorkRequest> {
  const parsedStatus = z.enum(statuses).parse(status);
  if (!isRequestId(id)) {
    throw new Error("Заявка не найдена");
  }
  const rows = await query(
    `update requests set status = $2 where id = $1
     returning ${REQUEST_SELECT}`,
    [id, parsedStatus],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("Заявка не найдена");
  }
  return parseRow(row);
}
