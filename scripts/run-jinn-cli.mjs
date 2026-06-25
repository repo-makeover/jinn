#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntry = path.join(repoRoot, "packages", "jinn", "dist", "bin", "jinn.js");

if (!existsSync(cliEntry)) {
  const build = spawnSync(pnpmBin(), ["--filter", "jinn-cli", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

const run = spawnSync(process.execPath, [cliEntry, ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (run.error) throw run.error;
process.exit(run.status ?? 0);

function pnpmBin() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}
