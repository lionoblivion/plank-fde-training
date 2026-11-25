import type {
  Completion,
  CompletionMessage,
  Provider,
  StreamEvents,
  TokenUsage,
} from "@/lib/providers";
import type { Tool } from "@/lib/tool-def";
import { listTools } from "@/lib/tools";

export type SessionTurn = {
  model: string;
  usage: TokenUsage;
  /** Цена на момент ответа; нет → unpriced в /cost. */
  inputPerMillion?: number;
  outputPerMillion?: number;
};

export type SessionCost = {
  inputTokens: number;
  outputTokens: number;
  /** $ только по ходам с опубликованной ценой. */
  dollars: number;
  /** Модели без цены — /cost называет их отдельно. */
  unpricedModels: string[];
};

export type SessionOptions = {
  temperature?: number;
  maxTokens?: number;
  effort?: Completion["effort"];
  /**
   * Инструменты хода. По умолчанию — реестр listTools().
   * Передай [] чтобы отключить.
   */
  tools?: Tool[];
};

/**
 * Сессия чата: провайдер, модель, system prompt, история и usage по ходам.
 */
export class Session {
  messages: CompletionMessage[] = [];
  turns: SessionTurn[] = [];

  constructor(
    public provider: Provider,
    public model: string,
    public system: string,
    public options: SessionOptions = {},
  ) {}

  private resolveTools(): Tool[] | undefined {
    if (this.options.tools !== undefined) {
      return this.options.tools;
    }
    return listTools();
  }

  /** Стримит ответ; при ошибке история не меняется. */
  async send(
    text: string,
    events: StreamEvents | ((chunk: string) => void),
  ): Promise<TokenUsage> {
    const nextMessages: CompletionMessage[] = [
      ...this.messages,
      { role: "user", content: text },
    ];

    let reply = "";
    const tools = this.resolveTools();
    const usage = await this.provider.stream(
      {
        model: this.model,
        system: this.system,
        messages: nextMessages,
        maxTokens: this.options.maxTokens,
        temperature: this.options.temperature,
        effort: this.options.effort,
        ...(tools && tools.length > 0 ? { tools } : {}),
      },
      typeof events === "function"
        ? {
            text: (chunk) => {
              reply += chunk;
              events(chunk);
            },
          }
        : {
            text: (chunk) => {
              reply += chunk;
              events.text(chunk);
            },
            tool: events.tool,
          },
    );

    this.messages = [...nextMessages, { role: "assistant", content: reply }];
    const listed = this.provider.models.find((m) => m.id === this.model);
    this.turns.push({
      model: this.model,
      usage,
      inputPerMillion: listed?.inputPerMillion,
      outputPerMillion: listed?.outputPerMillion,
    });
    return usage;
  }

  /** Смена провайдера/модели mid-conversation. */
  use(provider: Provider, model: string): void {
    this.provider = provider;
    this.model = model;
  }

  setSystem(system: string): void {
    this.system = system;
  }

  /**
   * Учёт spend вне send() — например research chain.
   * Не меняет messages.
   */
  record(model: string, usage: TokenUsage): void {
    const listed = this.provider.models.find((m) => m.id === model);
    this.turns.push({
      model,
      usage,
      inputPerMillion: listed?.inputPerMillion,
      outputPerMillion: listed?.outputPerMillion,
    });
  }

  /** Токены и $: каждый ход по цене модели, которая ответила. */
  cost(): SessionCost {
    let inputTokens = 0;
    let outputTokens = 0;
    let dollars = 0;
    const unpriced = new Set<string>();

    for (const turn of this.turns) {
      inputTokens += turn.usage.inputTokens;
      outputTokens += turn.usage.outputTokens;

      if (
        turn.inputPerMillion === undefined ||
        turn.outputPerMillion === undefined
      ) {
        unpriced.add(turn.model);
        continue;
      }
      dollars +=
        (turn.usage.inputTokens / 1_000_000) * turn.inputPerMillion +
        (turn.usage.outputTokens / 1_000_000) * turn.outputPerMillion;
    }

    return {
      inputTokens,
      outputTokens,
      dollars,
      unpricedModels: [...unpriced],
    };
  }
}
