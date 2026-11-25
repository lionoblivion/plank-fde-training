import { z } from "zod";

import { config } from "@/lib/config";
import { getPolicy, listPolicies } from "@/lib/policies";
import type { Provider, TokenUsage } from "@/lib/providers";
import { readPage, searchWeb } from "@/lib/tools/web";

/** События progress для CLI /cost. */
export type ResearchEvents = {
  step: (message: string) => void;
  text: (delta: string) => void;
  spend: (model: string, usage: TokenUsage) => void;
};

const planSchema = z.object({
  policies: z.array(z.string().trim().min(1)).max(3),
  searches: z.array(z.string().trim().min(1)).max(3),
});

export type ResearchPlan = z.infer<typeof planSchema>;

type NumberedSource = {
  n: number;
  title: string;
  kind: "policy" | "web";
  url?: string;
  text: string;
};

/** small = models[0], large = models[1] или та же, если одна. */
export function resolveResearchModels(provider: Provider): {
  small: string;
  large: string;
} {
  const small = provider.models[0]?.id;
  if (!small) {
    throw new Error(`${provider.name}: no models configured`);
  }
  const large = provider.models[1]?.id ?? small;
  return { small, large };
}

/** Достаёт JSON-объект из ответа модели (в т.ч. из fence). */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("No JSON object in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

async function collectCompletion(
  provider: Provider,
  completion: Parameters<Provider["stream"]>[0],
): Promise<{ text: string; usage: TokenUsage }> {
  let text = "";
  const usage = await provider.stream(completion, {
    text: (delta) => {
      text += delta;
    },
  });
  return { text, usage };
}

async function planStep(
  question: string,
  provider: Provider,
  smallModel: string,
  on: ResearchEvents,
): Promise<ResearchPlan> {
  on.step("Planning sources…");
  const catalog = await listPolicies();
  const catalogLines = catalog
    .map((p) => `- ${p.slug}: ${p.title} — ${p.summary}`)
    .join("\n");

  const system = `You plan research for WorkBot. Reply with JSON only, no markdown.
Shape: {"policies":["slug",...],"searches":["query",...]}
Pick up to 3 policy slugs from the catalog and up to 3 web search queries.
Prefer company policies over the web when they answer the question.`;

  const user = `Question: ${question}

Policy catalog:
${catalogLines}`;

  const first = await collectCompletion(provider, {
    model: smallModel,
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: 512,
    // Без tools — только JSON план
    tools: [],
  });
  on.spend(smallModel, first.usage);

  const tryParse = (raw: string): ResearchPlan | { error: string } => {
    try {
      return planSchema.parse(extractJsonObject(raw));
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const parsed = tryParse(first.text);
  if (!("error" in parsed)) {
    return parsed;
  }

  on.step("Re-planning (invalid JSON)…");
  const retry = await collectCompletion(provider, {
    model: smallModel,
    system,
    messages: [
      { role: "user", content: user },
      { role: "assistant", content: first.text },
      {
        role: "user",
        content: `Your previous reply was not valid JSON for the plan schema. Error:\n${parsed.error}\n\nReply again with JSON only.`,
      },
    ],
    maxTokens: 512,
    tools: [],
  });
  on.spend(smallModel, retry.usage);

  const second = tryParse(retry.text);
  if ("error" in second) {
    throw new Error(
      `Invalid research plan after retry: ${second.error}\nModel text:\n${retry.text}`,
    );
  }
  return second;
}

async function gatherSources(
  plan: ResearchPlan,
  on: ResearchEvents,
): Promise<NumberedSource[]> {
  on.step("Gathering sources…");
  const sources: NumberedSource[] = [];
  let n = 1;

  for (const slug of plan.policies.slice(0, 3)) {
    const policy = await getPolicy(slug);
    if (!policy) continue;
    sources.push({
      n,
      title: policy.title,
      kind: "policy",
      url: `/policies/${policy.slug}`,
      text: `# ${policy.title}\n\n${policy.body}`,
    });
    n += 1;
  }

  // Без Tavily — web из плана игнорируем (не падаем)
  if (!config.tavilyApiKey) {
    return sources;
  }

  for (const query of plan.searches.slice(0, 3)) {
    let results: Awaited<ReturnType<typeof searchWeb>> = [];
    try {
      results = await searchWeb(query);
    } catch {
      continue;
    }
    const top = results[0];
    if (!top) continue;

    let body = top.description;
    try {
      const page = await readPage(top.url);
      body = page.text || top.description;
    } catch {
      // snippet из поиска
    }

    sources.push({
      n,
      title: top.title,
      kind: "web",
      url: top.url,
      text: body,
    });
    n += 1;
  }

  return sources;
}

async function extractFromSource(
  question: string,
  source: NumberedSource,
  provider: Provider,
  largeModel: string,
): Promise<{ n: number; bullets: string; usage: TokenUsage }> {
  const result = await collectCompletion(provider, {
    model: largeModel,
    system:
      "Extract only facts from the given source that help answer the question. Reply with bullet points. Do not invent facts. Do not add citation numbers.",
    messages: [
      {
        role: "user",
        content: `Question: ${question}

Source [${source.n}] ${source.title}
${source.url ? `URL: ${source.url}\n` : ""}
---
${source.text.slice(0, 12_000)}
---

Bullet points of relevant facts:`,
      },
    ],
    maxTokens: 1024,
    tools: [],
  });
  // spend только после успешного Promise.all — иначе late-complete завышает /cost
  return {
    n: source.n,
    bullets: result.text.trim(),
    usage: result.usage,
  };
}

async function writeAnswer(
  question: string,
  sources: NumberedSource[],
  notes: Map<number, string>,
  provider: Provider,
  largeModel: string,
  on: ResearchEvents,
): Promise<string> {
  on.step("Writing answer…");

  const notesBlock = sources
    .map((s) => `[${s.n}] ${s.title}\n${notes.get(s.n) ?? "(no notes)"}`)
    .join("\n\n");

  const sourceList = sources
    .map((s) => `[${s.n}] ${s.title}${s.url ? ` — ${s.url}` : ""}`)
    .join("\n");

  let answer = "";
  const usage = await provider.stream(
    {
      model: largeModel,
      system: `You write a concise answer for WorkBot support.
After every factual claim put a citation like [1] matching the source numbers.
End with a "Sources" section listing the numbered sources provided.
Do not invent sources or numbers.`,
      messages: [
        {
          role: "user",
          content: `Question: ${question}

Notes by source:
${notesBlock}

Sources:
${sourceList}

Write the answer now:`,
        },
      ],
      maxTokens: 2048,
      tools: [],
    },
    {
      text: (delta) => {
        answer += delta;
        on.text(delta);
      },
    },
  );
  on.spend(largeModel, usage);
  return answer;
}

/**
 * Цепочка research: plan → gather → extract∥ → write.
 * Ошибки extract/write пробрасываются; история чата не трогаем здесь.
 */
export async function research(
  question: string,
  provider: Provider,
  on: ResearchEvents,
): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Empty research question");
  }

  const { small, large } = resolveResearchModels(provider);
  const plan = await planStep(trimmed, provider, small, on);
  const sources = await gatherSources(plan, on);

  if (sources.length === 0) {
    throw new Error("No sources gathered for research");
  }

  on.step(`Extracting facts from ${sources.length} source(s)…`);
  const extracted = await Promise.all(
    sources.map((source) =>
      extractFromSource(trimmed, source, provider, large),
    ),
  );
  const notes = new Map<number, string>();
  for (const item of extracted) {
    on.spend(large, item.usage);
    notes.set(item.n, item.bullets);
  }

  return writeAnswer(trimmed, sources, notes, provider, large, on);
}
