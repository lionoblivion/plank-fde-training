import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const VISITOR_COOKIE = "visitor";

/**
 * Перед страницами: каждому посетителю — httpOnly cookie visitor (UUID).
 * Идентифицирует профиль браузера, не человека.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(VISITOR_COOKIE)?.value) {
    response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      // На localhost (http) secure блокирует Set-Cookie
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      // Год: стабильный distinct_id между визитами
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  // Без /api, /_next и favicon — как в курсе
  matcher: ["/((?!api|_next|favicon.ico|icon|apple-icon).*)"],
};
