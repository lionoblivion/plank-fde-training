import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { z } from "zod";

/** Kebab-case slug без path-сегментов и traversal. */
export const policySlugSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug политики должен быть в kebab-case",
  );

/** Front matter одной политики. */
export const policyFrontMatterSchema = z.object({
  title: z.string().trim().min(1, "Укажите title"),
  slug: policySlugSchema,
  team: z.string().trim().min(1, "Укажите team"),
  summary: z.string().trim().min(1, "Укажите summary"),
});

export type PolicyFrontMatter = z.infer<typeof policyFrontMatterSchema>;

export type Policy = PolicyFrontMatter & {
  body: string;
};

const POLICIES_DIR = path.join(process.cwd(), "content", "policies");

/** Проверяет slug до любого обращения к файловой системе. */
export function assertSafePolicySlug(slug: string): string {
  return policySlugSchema.parse(slug);
}

/** Путь к файлу политики; отказывает, если путь выходит за каталог. */
export function resolvePolicyFilePath(slug: string): string {
  const safeSlug = assertSafePolicySlug(slug);
  const root = path.resolve(POLICIES_DIR);
  const filePath = path.resolve(root, `${safeSlug}.md`);
  const relative = path.relative(root, filePath);

  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative.includes(`..${path.sep}`)
  ) {
    throw new Error("Недопустимый путь к политике");
  }

  return filePath;
}

function parsePolicyFile(raw: string, expectedSlug?: string): Policy {
  const parsed = matter(raw);
  const frontMatter = policyFrontMatterSchema.parse(parsed.data);

  if (expectedSlug !== undefined && frontMatter.slug !== expectedSlug) {
    throw new Error(
      `Slug в front matter (${frontMatter.slug}) не совпадает с именем файла (${expectedSlug})`,
    );
  }

  return {
    ...frontMatter,
    body: parsed.content.trim(),
  };
}

/** Список политик (метаданные), кэш на время жизни деплоя. */
export async function listPolicies(): Promise<PolicyFrontMatter[]> {
  "use cache";

  const entries = await readdir(POLICIES_DIR, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase() !== "claude.md")
    .sort();

  const policies: PolicyFrontMatter[] = [];

  for (const fileName of markdownFiles) {
    try {
      const slugFromName = fileName.replace(/\.md$/i, "");
      const filePath = resolvePolicyFilePath(slugFromName);
      const raw = await readFile(filePath, "utf8");
      const policy = parsePolicyFile(raw, slugFromName);
      policies.push({
        title: policy.title,
        slug: policy.slug,
        team: policy.team,
        summary: policy.summary,
      });
    } catch {
      // Пропускаем битый файл: список не должен отдавать 500 из‑за одного .md
      continue;
    }
  }

  return policies;
}

/** Одна политика по slug или null, если нет файла / невалидный slug. */
export async function getPolicy(slug: string): Promise<Policy | null> {
  "use cache";

  const parsedSlug = policySlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return null;
  }

  try {
    const filePath = resolvePolicyFilePath(parsedSlug.data);
    const raw = await readFile(filePath, "utf8");
    return parsePolicyFile(raw, parsedSlug.data);
  } catch {
    // Нет файла или невалидный front matter → 404 на странице, не 500
    return null;
  }
}

/** Параметры для generateStaticParams. */
export async function listPolicyStaticParams(): Promise<{ slug: string }[]> {
  const policies = await listPolicies();
  return policies.map((policy) => ({ slug: policy.slug }));
}
