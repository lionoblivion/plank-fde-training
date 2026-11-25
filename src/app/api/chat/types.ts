import { z } from "zod";

/** Конверт тела useChat → /api/chat. */
export const chatRequestSchema = z.object({
  id: z.string().trim().min(1, "id обязателен"),
  messages: z.array(z.unknown()).min(1, "messages не должны быть пустыми"),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatErrorResponseSchema = z.object({
  error: z.string(),
});

export type ChatErrorResponse = z.infer<typeof chatErrorResponseSchema>;
