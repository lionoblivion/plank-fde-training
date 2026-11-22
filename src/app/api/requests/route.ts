import { z } from "zod";

import { createRequest, listRequests, type WorkRequest } from "@/lib/requests";

import {
  createRequestResponseSchema,
  errorResponseSchema,
  listRequestsResponseSchema,
  postRequestSchema,
  requestResponseSchema,
} from "./types";

function toResponseRequest(request: WorkRequest) {
  return requestResponseSchema.parse({
    ...request,
    createdAt: request.createdAt.toISOString(),
  });
}

export async function GET() {
  const requests = await listRequests();
  const body = listRequestsResponseSchema.parse({
    requests: requests.map(toResponseRequest),
  });
  return Response.json(body);
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    const body = errorResponseSchema.parse({
      error: "Некорректный JSON",
    });
    return Response.json(body, { status: 400 });
  }

  const parsed = postRequestSchema.safeParse(json);
  if (!parsed.success) {
    const body = errorResponseSchema.parse({
      error: "Ошибка валидации",
      details: z.flattenError(parsed.error).fieldErrors,
    });
    return Response.json(body, { status: 400 });
  }

  const created = createRequest(parsed.data);
  const body = createRequestResponseSchema.parse({
    request: toResponseRequest(created),
  });
  return Response.json(body, { status: 201 });
}
