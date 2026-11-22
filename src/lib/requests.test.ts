import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  countRequestsByStatus,
  createRequest,
  getRequest,
  listRequests,
  resetRequestStore,
  type WorkRequest,
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

    it("возвращает заявку по id и undefined для неизвестного", async () => {
      const created = createRequest({
        title: "Деталь",
        team: "finance",
      });

      await expect(getRequest(created.id)).resolves.toEqual(created);
      await expect(
        getRequest("00000000-0000-4000-8000-000000000000"),
      ).resolves.toBeUndefined();
    });
  });

  describe("countRequestsByStatus", () => {
    it("возвращает нули для пустого списка", () => {
      expect(countRequestsByStatus([])).toEqual({
        open: 0,
        in_progress: 0,
        done: 0,
      });
    });

    it("считает заявки по каждому статусу", () => {
      const requests: WorkRequest[] = [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Открыта",
          details: "",
          team: "operations",
          priority: "medium",
          status: "open",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "В работе",
          details: "",
          team: "finance",
          priority: "high",
          status: "in_progress",
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          title: "Готово",
          details: "",
          team: "support",
          priority: "low",
          status: "done",
          createdAt: new Date("2026-01-03T00:00:00.000Z"),
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          title: "Ещё открыта",
          details: "",
          team: "operations",
          priority: "medium",
          status: "open",
          createdAt: new Date("2026-01-04T00:00:00.000Z"),
        },
      ];

      expect(countRequestsByStatus(requests)).toEqual({
        open: 2,
        in_progress: 1,
        done: 1,
      });
    });
  });
});
