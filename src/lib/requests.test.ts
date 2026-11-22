import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  buildRequestsHref,
  createRequest,
  listRequests,
  parseRequestFilters,
  resetRequestStore,
} from "./requests";

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
    it("ставит priority=medium, status=open и пустой details", () => {
      const request = createRequest({
        title: "Заявка без опций",
        team: "finance",
      });

      expect(request.priority).toBe("medium");
      expect(request.details).toBe("");
      expect(request.status).toBe("open");
      expect(request.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(request.createdAt).toBeInstanceOf(Date);
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
    it("сохраняет заявки в общем списке, новые сверху", async () => {
      createRequest({
        title: "Первая",
        team: "operations",
      });
      createRequest({
        title: "Вторая",
        team: "support",
        priority: "low",
      });

      const listed = await listRequests();

      expect(listed).toHaveLength(2);
      expect(listed.map((item) => item.title)).toEqual(["Вторая", "Первая"]);
      expect(listed[0]?.status).toBe("open");
    });

    it("фильтрует список по team и status", async () => {
      createRequest({
        title: "Операции",
        team: "operations",
      });
      createRequest({
        title: "Поддержка",
        team: "support",
      });

      const byTeam = await listRequests({ team: "support" });
      expect(byTeam.map((item) => item.title)).toEqual(["Поддержка"]);

      const byStatus = await listRequests({ status: "open" });
      expect(byStatus).toHaveLength(2);

      const none = await listRequests({
        team: "support",
        status: "done",
      });
      expect(none).toHaveLength(0);
    });
  });

  describe("filters", () => {
    it("игнорирует неизвестные значения query", () => {
      expect(
        parseRequestFilters({ team: "legal", status: "archived" }),
      ).toEqual({});
      expect(
        parseRequestFilters({ team: "operations", status: "open" }),
      ).toEqual({
        team: "operations",
        status: "open",
      });
      expect(parseRequestFilters({ team: "", foo: "bar" })).toEqual({});
    });

    it("собирает href с выбранными фильтрами", () => {
      expect(buildRequestsHref({})).toBe("/requests");
      expect(buildRequestsHref({ team: "finance" })).toBe(
        "/requests?team=finance",
      );
      expect(buildRequestsHref({ team: "finance", status: "done" })).toBe(
        "/requests?team=finance&status=done",
      );
    });
  });
});
