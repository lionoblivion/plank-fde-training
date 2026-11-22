import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  assertSafePolicySlug,
  getPolicy,
  listPolicies,
  policyFrontMatterSchema,
  resolvePolicyFilePath,
} from "./policies";

describe("policies", () => {
  describe("slug safety", () => {
    it("принимает kebab-case slug", () => {
      expect(assertSafePolicySlug("expenses")).toBe("expenses");
      expect(assertSafePolicySlug("remote-work")).toBe("remote-work");
    });

    it.each([
      "../package",
      "..\\package",
      "/etc/passwd",
      "foo/bar",
      "FOO",
      ".hidden",
      "has space",
      "ends-",
      "-starts",
      "",
      "expenses.md",
    ])("отклоняет опасный или невалидный slug: %s", (slug) => {
      expect(() => assertSafePolicySlug(slug)).toThrow(ZodError);
      expect(() => resolvePolicyFilePath(slug)).toThrow(ZodError);
    });

    it("getPolicy не читает файл и возвращает null для traversal", async () => {
      await expect(getPolicy("../package")).resolves.toBeNull();
      await expect(getPolicy("foo/bar")).resolves.toBeNull();
    });
  });

  describe("front matter", () => {
    it("принимает полный набор полей", () => {
      const data = policyFrontMatterSchema.parse({
        title: "Расходы",
        slug: "expenses",
        team: "finance",
        summary: "Кратко о расходах",
      });

      expect(data.title).toBe("Расходы");
    });

    it("отклоняет пустой title и неизвестный формат slug", () => {
      expect(() =>
        policyFrontMatterSchema.parse({
          title: "  ",
          slug: "Bad_Slug",
          team: "finance",
          summary: "x",
        }),
      ).toThrow(ZodError);
    });
  });

  describe("content files", () => {
    it("listPolicies возвращает ровно 8 политик", async () => {
      const policies = await listPolicies();
      expect(policies).toHaveLength(8);
      expect(new Set(policies.map((p) => p.slug)).size).toBe(8);
    });

    it("читает политику expenses с телом Markdown", async () => {
      const policy = await getPolicy("expenses");
      expect(policy).not.toBeNull();
      expect(policy?.title).toBe("Расходы и компенсации");
      expect(policy?.team).toBe("finance");
      expect(policy?.body).toContain("Область применения");
    });

    it("возвращает null для неизвестного, но безопасного slug", async () => {
      await expect(getPolicy("does-not-exist")).resolves.toBeNull();
    });
  });
});
