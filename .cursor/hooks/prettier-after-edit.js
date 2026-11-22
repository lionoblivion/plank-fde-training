/**
 * Cursor afterFileEdit hook: format the edited file with project Prettier.
 * Reads JSON from stdin: { file_path, edits, ... }. Fail-open on errors.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0);
  }

  const filePath = payload.file_path || payload.filePath;
  if (!filePath || !fs.existsSync(filePath)) {
    process.exit(0);
  }

  const prettierCli = path.join(
    process.cwd(),
    "node_modules",
    "prettier",
    "bin",
    "prettier.cjs",
  );
  const prettierFallback = path.join(
    process.cwd(),
    "node_modules",
    "prettier",
    "prettier.cjs",
  );
  const bin = fs.existsSync(prettierCli)
    ? prettierCli
    : fs.existsSync(prettierFallback)
      ? prettierFallback
      : null;

  if (!bin) {
    process.exit(0);
  }

  spawnSync(
    process.execPath,
    [bin, "--write", "--ignore-unknown", "--log-level", "warn", "--", filePath],
    { stdio: "ignore" },
  );
  process.exit(0);
}

main();
