import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { createRequest, listRequests, resetRequestStore } from "./requests";

describe("requests", () => {
  beforeEach(() => {
    resetRequestStore();
  });

  describe("trimming", () => {
    it("удаляет пробелы по краям title и details", () => {
      const request = createRequest({
        title: "  Нужен доступ  ",
        details: "  Описание заявки  ",
        team: "operations",
        priority: "high",
      });

      expect(request.title).toBe("Нужен доступ");
      expect(request.details).toBe("Описание заявки");
    });
  });

  describe("defaults", () => {
    it("ставит priority=medium и пустой details, если их не передали", () => {
      const request = createRequest({
        title: "Заявка без опций",
        team: "finance",
      });

      expect(request.priority).toBe("medium");
      expect(request.details).toBe("");
    });
  });

  describe("rejection", () => {
    it("отклоняет пустой title после trim", () => {
      expect(() =>
        createRequest({
          title: "   ",
          team: "support",
        }),
      ).toThrow(ZodError);
    });

    it("отклоняет неизвестный team", () => {
      expect(() =>
        createRequest({
          title: "Заявка",
          team: "legal",
        }),
      ).toThrow(ZodError);
    });

    it("отклоняет неизвестный priority", () => {
      expect(() =>
        createRequest({
          title: "Заявка",
          team: "operations",
          priority: "urgent",
        }),
      ).toThrow(ZodError);
    });
  });

  describe("store", () => {
    it("сохраняет заявки в общем списке через globalThis", () => {
      createRequest({
        title: "Первая",
        team: "operations",
      });
      createRequest({
        title: "Вторая",
        team: "support",
        priority: "low",
      });

      const listed = listRequests();

      expect(listed).toHaveLength(2);
      expect(listed.map((item) => item.title)).toEqual(["Первая", "Вторая"]);
    });
  });
});
