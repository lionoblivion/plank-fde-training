import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output, stderr } from "node:process";
import { parseArgs } from "node:util";

import { anthropic, groq, openai, type Provider } from "@/lib/providers";
import { Session } from "@/lib/session";
import { systemPrompt as defaultSystemPrompt } from "@/lib/system-prompt";

type Factory = () => Provider;

/** Провайдеры проекта: по умолчанию Groq (есть ключ; Anthropic без credits). */
const factories: Record<string, Factory> = {
  groq,
  anthropic,
  openai,
};

function resolveProvider(name: string): Provider {
  const factory = factories[name];
  if (!factory) {
    throw new Error(
      `Неизвестный провайдер "${name}". Доступны: ${Object.keys(factories).join(", ")}`,
    );
  }
  return factory();
}

function formatCost(session: Session): string {
  const cost = session.cost();
  const lines = [
    `токены: in ${cost.inputTokens} · out ${cost.outputTokens}`,
    `стоимость: $${cost.dollars.toFixed(6)}`,
  ];
  if (cost.unpricedModels.length > 0) {
    lines.push(`без цены: ${cost.unpricedModels.join(", ")} (в $ не входят)`);
  }
  return lines.join("\n");
}

function printHelp(): void {
  output.write(`Команды:
  /help
  /exit
  /cost                         — токены и $ за сессию
  /model [provider] [model]     — список или смена модели
  /system [text]                — показать или заменить system prompt
`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      provider: { type: "string", short: "p", default: "groq" },
      model: { type: "string", short: "m" },
      effort: { type: "string" },
      temperature: { type: "string" },
      "max-tokens": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    output.write(
      `Использование: pnpm chat [--provider name] [--model id] [--effort low|medium|high] [--temperature 0-1] [--max-tokens n]\n`,
    );
    printHelp();
    return;
  }

  const providerName = values.provider ?? "groq";
  let provider = resolveProvider(providerName);
  const model = values.model ?? provider.models[0]?.id;
  if (!model) {
    throw new Error(`${providerName}: нет моделей`);
  }

  const temperature =
    values.temperature !== undefined ? Number(values.temperature) : undefined;
  const maxTokens =
    values["max-tokens"] !== undefined
      ? Number(values["max-tokens"])
      : undefined;
  const validEfforts = ["low", "medium", "high", "xhigh", "max"] as const;
  type Effort = (typeof validEfforts)[number];
  let effort: Effort | undefined;
  if (values.effort !== undefined) {
    if (!(validEfforts as readonly string[]).includes(values.effort)) {
      throw new Error(
        `Неверный --effort "${values.effort}". Варианты: ${validEfforts.join(", ")}`,
      );
    }
    effort = values.effort as Effort;
  }

  const session = new Session(provider, model, defaultSystemPrompt, {
    temperature: Number.isFinite(temperature) ? temperature : undefined,
    maxTokens: Number.isFinite(maxTokens) ? maxTokens : undefined,
    effort,
  });

  const interactive = Boolean(input.isTTY && output.isTTY);
  if (interactive) {
    output.write(
      `WorkBot · ${providerName} · ${session.model}\nКоманды: /help\n\n`,
    );
  }

  const rl = createInterface({
    input,
    output,
    terminal: interactive,
    ...(interactive ? { prompt: "you> " } : {}),
  });

  const again = () => {
    if (interactive) rl.prompt();
  };

  try {
    again();
    for await (const line of rl) {
      const text = line.trim();
      if (!text) {
        again();
        continue;
      }

      if (text === "/exit" || text === "/quit") {
        break;
      }
      if (text === "/help") {
        printHelp();
        again();
        continue;
      }
      if (text === "/cost") {
        output.write(`${formatCost(session)}\n`);
        again();
        continue;
      }
      if (text === "/system" || text.startsWith("/system ")) {
        const rest = text.slice("/system".length).trim();
        if (!rest) {
          output.write(`${session.system}\n`);
        } else {
          session.setSystem(rest);
          output.write("System prompt обновлён.\n");
        }
        again();
        continue;
      }
      if (text === "/model" || text.startsWith("/model ")) {
        const parts = text.split(/\s+/).slice(1);
        if (parts.length === 0) {
          output.write(
            `provider: ${session.provider.name}\nmodel: ${session.model}\nmodels:\n`,
          );
          for (const m of session.provider.models) {
            const price =
              m.inputPerMillion !== undefined &&
              m.outputPerMillion !== undefined
                ? `$${m.inputPerMillion}/$${m.outputPerMillion} за 1M`
                : "без цены";
            output.write(`  - ${m.id} (${price})\n`);
          }
          again();
          continue;
        }
        const [nextProviderName, nextModel] = parts;
        if (!nextProviderName) {
          again();
          continue;
        }
        if (nextModel) {
          // /model openai gpt-5.4-mini — id может быть не в списке → unpriced
          provider = resolveProvider(nextProviderName);
          session.use(provider, nextModel);
        } else if (factories[nextProviderName]) {
          provider = resolveProvider(nextProviderName);
          const defaultModel = provider.models[0]?.id;
          if (!defaultModel) {
            stderr.write(`${nextProviderName}: нет моделей\n`);
            again();
            continue;
          }
          session.use(provider, defaultModel);
        } else {
          session.use(session.provider, nextProviderName);
        }
        output.write(`Сейчас: ${session.provider.name} · ${session.model}\n`);
        again();
        continue;
      }

      try {
        if (interactive) output.write("workbot> ");
        await session.send(text, (chunk) => output.write(chunk));
        output.write("\n");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stderr.write(`Ошибка: ${message}\n`);
      }
      again();
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
