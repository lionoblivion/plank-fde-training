import { describe, expect, it } from "vitest";

import { evaluateExpression } from "@/lib/tools/calculator";

describe("evaluateExpression", () => {
  it("соблюдает приоритет * над +", () => {
    expect(evaluateExpression("2+3*4")).toBe(14);
  });

  it("считает скобки раньше умножения", () => {
    expect(evaluateExpression("(2+3)*4")).toBe(20);
  });

  it("поддерживает отрицательные числа", () => {
    expect(evaluateExpression("-5+2")).toBe(-3);
    expect(evaluateExpression("-(2+3)")).toBe(-5);
  });

  it("возводит в степень правоассоциативно", () => {
    expect(evaluateExpression("2^3")).toBe(8);
    expect(evaluateExpression("2^3^2")).toBe(512);
  });

  it("делит и берёт остаток", () => {
    expect(evaluateExpression("10/4")).toBe(2.5);
    expect(evaluateExpression("10%3")).toBe(1);
  });

  it("отклоняет некорректный ввод", () => {
    expect(() => evaluateExpression("2+")).toThrow();
    expect(() => evaluateExpression("abc")).toThrow(/Unknown character/);
    expect(() => evaluateExpression("2+(3")).toThrow();
  });

  it("отклоняет деление на ноль", () => {
    expect(() => evaluateExpression("1/0")).toThrow(/Division by zero/);
    expect(() => evaluateExpression("1%0")).toThrow(/Division by zero/);
  });

  it("отклоняет non-finite результаты", () => {
    expect(() => evaluateExpression("1e999")).toThrow(/Unknown character/);
    // 999^999 → Infinity
    expect(() => evaluateExpression("999^999")).toThrow(/Non-finite/);
  });
});
