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
  const parsed = requestSchema.safeParse({
    title: formValue(formData, "title") ?? "",
    details: formValue(formData, "details"),
    team: formValue(formData, "team"),
    priority: formValue(formData, "priority") || undefined,
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  createRequest(parsed.data);
  redirect("/requests");
}
