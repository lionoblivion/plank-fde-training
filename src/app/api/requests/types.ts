import { z } from "zod";

import { requestSchema, statuses } from "@/lib/request-model";

/** Тело POST — та же схема заявки, что у формы. */
export const postRequestSchema = requestSchema;

export type PostRequestBody = z.infer<typeof postRequestSchema>;

/** Заявка в JSON-ответе (createdAt как ISO-строка). */
export const requestResponseSchema = requestSchema.extend({
  id: z.string().uuid(),
  status: z.enum(statuses),
  createdAt: z.string(),
});

export type RequestResponse = z.infer<typeof requestResponseSchema>;

export const listRequestsResponseSchema = z.object({
  requests: z.array(requestResponseSchema),
});

export type ListRequestsResponse = z.infer<typeof listRequestsResponseSchema>;

export const createRequestResponseSchema = z.object({
  request: requestResponseSchema,
});

export type CreateRequestResponse = z.infer<typeof createRequestResponseSchema>;

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
