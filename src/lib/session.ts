import type {
  Completion,
  CompletionMessage,
  Provider,
  TokenUsage,
} from "@/lib/providers";

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

  /** Стримит ответ; при ошибке история не меняется. */
  async send(
    text: string,
    onText: (chunk: string) => void,
  ): Promise<TokenUsage> {
    const nextMessages: CompletionMessage[] = [
      ...this.messages,
      { role: "user", content: text },
    ];

    let reply = "";
    const usage = await this.provider.stream(
      {
        model: this.model,
        system: this.system,
        messages: nextMessages,
        maxTokens: this.options.maxTokens,
        temperature: this.options.temperature,
        effort: this.options.effort,
      },
      (chunk) => {
        reply += chunk;
        onText(chunk);
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
