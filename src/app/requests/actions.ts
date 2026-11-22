"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createRequest, requestSchema } from "@/lib/requests";

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

  createRequest(parsed.data);
  redirect("/requests");
}
