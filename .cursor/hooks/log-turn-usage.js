/**
 * Cursor stop-hook: пишет реальный model + tokens хода в локальные циклы.
 * Не выдумывает значения: если полей нет — tokens_available: false.
 * Fail-open.
 */
const fs = require("node:fs");
const path = require("node:path");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      out[key] = obj[key];
    }
  }
  return out;
}

function main() {
  let payload = {};
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.stdout.write("{}\n");
    process.exit(0);
  }

  const cyclesDir = path.resolve(
    process.cwd(),
    "..",
    "doc-plank-fde-training",
    "циклы",
  );

  const tokenFields = pick(payload, [
    "input_tokens",
    "output_tokens",
    "cache_read_tokens",
    "cache_write_tokens",
    "total_tokens",
  ]);
  const hasTokens = Object.keys(tokenFields).length > 0;

  const record = {
    recorded_at: new Date().toISOString(),
    source: "cursor.stop",
    status: payload.status ?? null,
    conversation_id: payload.conversation_id ?? payload.session_id ?? null,
    generation_id: payload.generation_id ?? null,
    model: payload.model ?? null,
    model_id: payload.model_id ?? null,
    model_params: payload.model_params ?? null,
    tokens_available: hasTokens,
    ...tokenFields,
    // Сырой набор ключей payload — для отладки схемы без утечки текста ответа
    payload_keys: Object.keys(payload).sort(),
  };

  try {
    fs.mkdirSync(cyclesDir, { recursive: true });
    const lastPath = path.join(cyclesDir, "_last-turn-usage.json");
    fs.writeFileSync(lastPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

    const logPath = path.join(cyclesDir, "_usage-log.md");
    const modelLabel =
      record.model_id || record.model || "н/д (поле model отсутствует в payload)";
    let tokensLine;
    if (hasTokens) {
      const parts = [];
      if (record.input_tokens != null) parts.push(`in ${record.input_tokens}`);
      if (record.output_tokens != null) parts.push(`out ${record.output_tokens}`);
      if (record.cache_read_tokens != null)
        parts.push(`cache_read ${record.cache_read_tokens}`);
      if (record.cache_write_tokens != null)
        parts.push(`cache_write ${record.cache_write_tokens}`);
      tokensLine = parts.join(" · ");
    } else {
      tokensLine =
        "н/д — в stop payload не было полей токенов (не подставлять нули)";
    }

    const line = `- ${record.recorded_at} · model: \`${modelLabel}\` · ${tokensLine} · generation: \`${record.generation_id ?? "н/д"}\`\n`;
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(
        logPath,
        "# Usage log (только данные из Cursor stop hook)\n\n",
        "utf8",
      );
    }
    fs.appendFileSync(logPath, line, "utf8");
  } catch {
    // fail-open
  }

  process.stdout.write("{}\n");
}

main();
