import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { z } from "zod";

import { config } from "@/lib/config";
import { tool } from "@/lib/tool-def";

const MAX_BODY_BYTES = 512 * 1024;
const MAX_TEXT_CHARS = 8000;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 15_000;

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (
    ((parts[0]! << 24) >>> 0) +
    ((parts[1]! << 16) >>> 0) +
    ((parts[2]! << 8) >>> 0) +
    (parts[3]! >>> 0)
  );
}

function inCidrV4(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

/** Запрещённые IPv4: loopback, private, CGNAT, link-local, … */
function isBlockedIpv4(ip: string): boolean {
  return (
    inCidrV4(ip, "0.0.0.0", 8) ||
    inCidrV4(ip, "10.0.0.0", 8) ||
    inCidrV4(ip, "127.0.0.0", 8) ||
    inCidrV4(ip, "169.254.0.0", 16) ||
    inCidrV4(ip, "172.16.0.0", 12) ||
    inCidrV4(ip, "192.168.0.0", 16) ||
    inCidrV4(ip, "100.64.0.0", 10) ||
    inCidrV4(ip, "192.0.0.0", 24) ||
    inCidrV4(ip, "192.0.2.0", 24) ||
    inCidrV4(ip, "198.51.100.0", 24) ||
    inCidrV4(ip, "203.0.113.0", 24) ||
    inCidrV4(ip, "224.0.0.0", 4) ||
    inCidrV4(ip, "240.0.0.0", 4)
  );
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  // Unique local fc00::/7, link-local fe80::/10
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  // IPv4-mapped
  if (normalized.includes(".")) {
    const mapped = normalized.split(":").pop();
    if (mapped && isIP(mapped) === 4) return isBlockedIpv4(mapped);
  }
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true;
}

function assertSafeHostname(hostname: string): void {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    throw new Error("URL host is not allowed");
  }
}

/** Проверка URL + DNS: без частных IP (SSRF / rebinding). */
export async function assertSafeUrl(urlString: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }
  assertSafeHostname(url.hostname);

  if (isIP(url.hostname)) {
    if (isBlockedIp(url.hostname)) {
      throw new Error("URL resolves to a blocked address");
    }
    return url;
  }

  const records = await lookup(url.hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error("DNS lookup failed");
  }
  for (const record of records) {
    if (isBlockedIp(record.address)) {
      throw new Error("URL resolves to a blocked address");
    }
  }
  return url;
}

function htmlToText(html: string): string {
  const withoutDanger = html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n");
  const withBreaks = withoutDanger.replace(
    /<\/(p|div|br|li|h[1-6]|tr|section|article|header|footer)>/gi,
    "\n",
  );
  const noTags = withBreaks.replace(/<[^>]+>/g, " ");
  return noTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function readBodyLimited(
  response: Response,
  limit: number,
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).length > limit) {
      throw new Error("Response body too large");
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error("Response body too large");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

/**
 * Безопасная загрузка страницы: ручные redirects, проверка IP на каждом шаге.
 */
export async function readPage(
  urlString: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ url: string; text: string }> {
  let current = await assertSafeUrl(urlString);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchImpl(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "text/html,text/plain;q=0.9,*/*;q=0.1" },
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect without Location");
      }
      const next = new URL(location, current);
      current = await assertSafeUrl(next.toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const raw = await readBodyLimited(response, MAX_BODY_BYTES);
    const contentType = response.headers.get("content-type") ?? "";
    const text = contentType.includes("html")
      ? htmlToText(raw)
      : raw.replace(/\s+/g, " ").trim();
    const clipped =
      text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}…` : text;

    return { url: current.toString(), text: clipped };
  }

  throw new Error("Too many redirects");
}

export type WebSearchResult = {
  title: string;
  url: string;
  description: string;
};

/** Tavily Search API — ключ не логируем. */
export async function searchWeb(
  query: string,
  options: {
    apiKey?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<WebSearchResult[]> {
  const apiKey = options.apiKey ?? config.tavilyApiKey;
  if (!apiKey) {
    throw new Error("Tavily Search is not configured");
  }
  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchImpl("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily Search failed with HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };
  const results = data.results ?? [];
  return results
    .filter((item) => item.title && item.url)
    .map((item) => ({
      title: String(item.title),
      url: String(item.url),
      description: String(item.content ?? ""),
    }));
}

export const readUrlTool = tool({
  name: "read_url",
  description:
    "Читает публичную веб-страницу по HTTP/HTTPS URL и возвращает извлечённый текст (без HTML). Вызывай, когда нужно содержимое конкретной страницы или документации по ссылке.",
  input: z.object({
    url: z.string().url().describe("Полный http(s) URL страницы"),
  }),
  async run({ url }) {
    return readPage(url);
  },
});

export const webSearchTool = tool({
  name: "web_search",
  description:
    "Ищет в интернете через Tavily Search. Вызывай для свежих фактов, новостей или когда нет корпоративного документа. Возвращает title, url, description.",
  input: z.object({
    query: z.string().trim().min(1).max(200).describe("Поисковый запрос"),
  }),
  async run({ query }) {
    return { results: await searchWeb(query) };
  },
});
