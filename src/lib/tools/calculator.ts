import { z } from "zod";

import { tool } from "@/lib/tool-def";

const MAX_EXPRESSION_LENGTH = 200;
const MAX_DEPTH = 32;

class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Recursive descent: expr → term ((+|-) term)*
 * term → unary ((*|/|%) unary)*
 * unary → (- unary) | power
 * power → primary (^ unary)?   // правоассоциативно
 * primary → number | ( expr )
 */
class Parser {
  private i = 0;
  private depth = 0;

  constructor(private readonly src: string) {}

  parse(): number {
    this.skipWs();
    const value = this.parseExpr();
    this.skipWs();
    if (this.i < this.src.length) {
      throw new ParseError(`Unexpected character at ${this.i}`);
    }
    return this.finish(value);
  }

  private parseExpr(): number {
    this.enter();
    let left = this.parseTerm();
    for (;;) {
      this.skipWs();
      const op = this.peek();
      if (op !== "+" && op !== "-") break;
      this.i += 1;
      const right = this.parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    this.leave();
    return left;
  }

  private parseTerm(): number {
    this.enter();
    let left = this.parseUnary();
    for (;;) {
      this.skipWs();
      const op = this.peek();
      if (op !== "*" && op !== "/" && op !== "%") break;
      this.i += 1;
      const right = this.parseUnary();
      if (op === "/") {
        if (right === 0) throw new ParseError("Division by zero");
        left = left / right;
      } else if (op === "%") {
        if (right === 0) throw new ParseError("Division by zero");
        left = left % right;
      } else {
        left = left * right;
      }
    }
    this.leave();
    return left;
  }

  private parseUnary(): number {
    this.skipWs();
    if (this.peek() === "-") {
      this.i += 1;
      return -this.parseUnary();
    }
    if (this.peek() === "+") {
      this.i += 1;
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): number {
    this.enter();
    const base = this.parsePrimary();
    this.skipWs();
    if (this.peek() === "^") {
      this.i += 1;
      // правоассоциативность: 2^3^2 = 2^(3^2)
      const exp = this.parseUnary();
      const value = base ** exp;
      this.leave();
      return value;
    }
    this.leave();
    return base;
  }

  private parsePrimary(): number {
    this.skipWs();
    if (this.peek() === "(") {
      this.i += 1;
      const value = this.parseExpr();
      this.skipWs();
      if (this.peek() !== ")") {
        throw new ParseError("Expected closing parenthesis");
      }
      this.i += 1;
      return value;
    }
    return this.parseNumber();
  }

  private parseNumber(): number {
    this.skipWs();
    const start = this.i;
    while (this.i < this.src.length && /[0-9]/.test(this.src[this.i]!)) {
      this.i += 1;
    }
    if (this.peek() === "." && /[0-9]/.test(this.src[this.i + 1] ?? "")) {
      this.i += 1;
      while (this.i < this.src.length && /[0-9]/.test(this.src[this.i]!)) {
        this.i += 1;
      }
    }
    if (this.i === start) {
      throw new ParseError(`Expected number at ${this.i}`);
    }
    const raw = this.src.slice(start, this.i);
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new ParseError(`Invalid number: ${raw}`);
    }
    return value;
  }

  private finish(value: number): number {
    if (!Number.isFinite(value)) {
      throw new ParseError("Non-finite result");
    }
    return value;
  }

  private peek(): string {
    return this.src[this.i] ?? "";
  }

  private skipWs(): void {
    while (this.i < this.src.length && /\s/.test(this.src[this.i]!)) {
      this.i += 1;
    }
  }

  private enter(): void {
    this.depth += 1;
    if (this.depth > MAX_DEPTH) {
      throw new ParseError("Expression too nested");
    }
  }

  private leave(): void {
    this.depth -= 1;
  }
}

/** Вычисляет выражение без eval/Function. */
export function evaluateExpression(expression: string): number {
  const trimmed = expression.trim();
  if (!trimmed) {
    throw new ParseError("Empty expression");
  }
  if (trimmed.length > MAX_EXPRESSION_LENGTH) {
    throw new ParseError("Expression too long");
  }
  if (/[^0-9+\-*/%^().\s]/.test(trimmed)) {
    throw new ParseError("Unknown character in expression");
  }
  return new Parser(trimmed).parse();
}

export const calculatorTool = tool({
  name: "calculator",
  description:
    "Вычисляет математическое выражение. Вызывай calculator для любых расчётов — даже простых (сумма, проценты, степень). Поддержка + - * / % ^ и скобок. Не считай в уме.",
  input: z.object({
    expression: z
      .string()
      .min(1)
      .max(MAX_EXPRESSION_LENGTH)
      .describe("Математическое выражение, например (2+3)*4^2"),
  }),
  run({ expression }) {
    const value = evaluateExpression(expression);
    return { expression, value };
  },
});
