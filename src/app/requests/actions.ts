"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { track } from "@/lib/analytics";
import {
  createRequest,
  requestSchema,
  updateRequestStatus,
} from "@/lib/requests";

export type CreateRequestState = {
  errors?: {
    title?: string[];
    details?: string[];
    team?: string[];
    priority?: string[];
  };
  values?: {
    title?: string;
    details?: string;
    team?: string;
    priority?: string;
  };
};

function formValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  return value;
}

export async function createRequestAction(
  _prevState: CreateRequestState,
  formData: FormData,
): Promise<CreateRequestState> {
  const values = {
    title: formValue(formData, "title") ?? "",
    details: formValue(formData, "details") ?? "",
    team: formValue(formData, "team") ?? "",
    priority: formValue(formData, "priority") || "medium",
  };

  const parsed = requestSchema.safeParse({
    title: values.title,
    details: values.details || undefined,
    team: values.team || undefined,
    priority: values.priority || undefined,
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }

  const created = await createRequest(parsed.data);
  await track("request_submitted", {
    requestId: created.id,
    team: created.team,
  });
  redirect("/requests");
}

/**
 * Меняет статус заявки с detail-страницы.
 * Вызывать как formAction: setStatus.bind(null, id, status).
 */
export async function setStatus(id: string, status: string): Promise<void> {
  // updateRequestStatus сверяет status с enum схемы до записи
  const updated = await updateRequestStatus(id, status);
  await track("request_status_changed", {
    requestId: updated.id,
    team: updated.team,
    status: updated.status,
  });
  refresh();
}
