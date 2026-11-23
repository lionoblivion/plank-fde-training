import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output, stderr } from "node:process";
import { parseArgs } from "node:util";

import { anthropic, groq, openai, type Provider } from "@/lib/providers";
import { Session } from "@/lib/session";
import { systemPrompt as defaultSystemPrompt } from "@/lib/system-prompt";

type Factory = () => Provider;

const factories: Record<string, Factory> = {
  anthropic,
  openai,
  groq,
};

function resolveProvider(name: string): Provider {
  const factory = factories[name];
  if (!factory) {
    throw new Error(
      `Unknown provider "${name}". Use: ${Object.keys(factories).join(", ")}`,
    );
  }
  return factory();
}

function formatCost(session: Session): string {
  const cost = session.cost();
  const lines = [`tokens: in ${cost.inputTokens} · out ${cost.outputTokens}`];
  if (cost.dollars === null) {
    lines.push(`cost: n/a (unpriced model: ${cost.unpricedModels.join(", ")})`);
  } else {
    lines.push(`cost: $${cost.dollars.toFixed(6)}`);
  }
  return lines.join("\n");
}

function printHelp(): void {
  output.write(`Commands:
  /help
  /exit
  /cost
  /model [provider] [model]   — list or switch
  /system [text]              — show or replace system prompt
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
      `Usage: pnpm chat [--provider name] [--model id] [--effort low|medium|high] [--temperature 0-1] [--max-tokens n]\n`,
    );
    printHelp();
    return;
  }

  const providerName = values.provider ?? "groq";
  let provider = resolveProvider(providerName);
  const model = values.model ?? provider.models[0]?.id;
  if (!model) {
    throw new Error(`${providerName}: no models configured`);
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
        `Invalid --effort "${values.effort}". Use: ${validEfforts.join(", ")}`,
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
      `WorkBot · ${providerName} · ${session.model}\nType /help for commands.\n\n`,
    );
  }

  const rl = createInterface({
    input,
    output,
    terminal: interactive,
    ...(interactive ? { prompt: "you> " } : {}),
  });

  try {
    if (interactive) rl.prompt();
    for await (const line of rl) {
      const text = line.trim();
      if (!text) continue;

      if (text === "/exit" || text === "/quit") {
        break;
      }
      if (text === "/help") {
        printHelp();
        continue;
      }
      if (text === "/cost") {
        output.write(`${formatCost(session)}\n`);
        continue;
      }
      if (text === "/system" || text.startsWith("/system ")) {
        const rest = text.slice("/system".length).trim();
        if (!rest) {
          output.write(`${session.system}\n`);
        } else {
          session.setSystem(rest);
          output.write("System prompt updated.\n");
        }
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
                ? `$${m.inputPerMillion}/$${m.outputPerMillion} per 1M`
                : "unpriced";
            output.write(`  - ${m.id} (${price})\n`);
          }
          continue;
        }
        const [nextProviderName, nextModel] = parts;
        if (!nextProviderName) continue;
        if (nextModel) {
          provider = resolveProvider(nextProviderName);
          session.use(provider, nextModel);
        } else if (factories[nextProviderName]) {
          provider = resolveProvider(nextProviderName);
          const defaultModel = provider.models[0]?.id;
          if (!defaultModel) {
            stderr.write(`${nextProviderName}: no models\n`);
            continue;
          }
          session.use(provider, defaultModel);
        } else {
          // Только id модели на текущем провайдере (или произвольный unpriced)
          session.use(session.provider, nextProviderName);
        }
        output.write(`Now: ${session.provider.name} · ${session.model}\n`);
        continue;
      }

      try {
        if (interactive) output.write("workbot> ");
        await session.send(text, (chunk) => output.write(chunk));
        output.write("\n");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stderr.write(`Error: ${message}\n`);
      }
      if (interactive) rl.prompt();
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
