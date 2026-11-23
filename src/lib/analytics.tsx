import { Suspense, type ReactNode } from "react";
import { after } from "next/server";
import { cookies } from "next/headers";

import { config } from "@/lib/config";

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Отправка события в PostHog после ответа (after).
 * Без ключа — no-op. Properties только про записи (requestId, team, …), не PII.
 */
export async function track(
  event: string,
  properties: AnalyticsProperties = {},
): Promise<void> {
  const apiKey = config.posthogKey;
  if (!apiKey) {
    return;
  }

  try {
    const cookieStore = await cookies();
    const distinctId = cookieStore.get("visitor")?.value ?? crypto.randomUUID();

    // Убираем undefined — в JSON не тащим лишнее
    const cleanProps: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (value !== undefined) {
        cleanProps[key] = value;
      }
    }

    const body = {
      api_key: apiKey,
      distinct_id: distinctId,
      event,
      properties: cleanProps,
      timestamp: new Date().toISOString(),
    };

    after(async () => {
      try {
        await fetch(`${config.posthogHost}/i/v0/e/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        // Аналитика не должна ломать ответ
      }
    });
  } catch {
    // cookies()/after вне request-контекста — не рвём Server Action
  }
}

async function TrackEffect({
  event,
  properties,
}: {
  event: string;
  properties?: AnalyticsProperties;
}): Promise<ReactNode> {
  await track(event, properties);
  return null;
}

/**
 * Page-view событие из RSC. Suspense: cookies() — request-time при Cache Components.
 */
export function Track({
  event,
  properties,
}: {
  event: string;
  properties?: AnalyticsProperties;
}) {
  return (
    <Suspense fallback={null}>
      <TrackEffect event={event} properties={properties} />
    </Suspense>
  );
}
