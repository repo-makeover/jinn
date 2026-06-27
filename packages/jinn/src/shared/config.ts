import fs from "node:fs";
import yaml from "js-yaml";
import { CONFIG_PATH } from "./paths.js";
import { safeWriteYaml } from "./safe-write.js";
import { KNOWLEDGE_OUTBOX_JSONL } from "./paths.js";
import type { BoardWorkerConfig, JinnConfig, KnowledgeConfig } from "./types.js";
import { validateConfigShape } from "./config-schema.js";
export { validateConfigShape } from "./config-schema.js";

type ClaudeEngineConfig = JinnConfig["engines"]["claude"];
type NormalizedBoardWorkerConfig = Required<NonNullable<JinnConfig["boardWorker"]>> & {
  schedule: {
    weekday: { start: string; end: string };
    weekend: { start: string; end: string };
  };
  usage: { minRemainingPercent: number };
};

const DEFAULT_BOARD_WORKER_WINDOW = { start: "22:00", end: "04:00" } as const;
const TIME_OF_DAY_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_GATEWAY_PORT = 7777;
const DEFAULT_GATEWAY_HOST = "127.0.0.1";

function systemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function normalizeWindow(
  raw: { start?: unknown; end?: unknown } | undefined,
): { start: string; end: string } {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BOARD_WORKER_WINDOW };
  const start = typeof raw.start === "string" && TIME_OF_DAY_RE.test(raw.start)
    ? raw.start
    : DEFAULT_BOARD_WORKER_WINDOW.start;
  const end = typeof raw.end === "string" && TIME_OF_DAY_RE.test(raw.end)
    ? raw.end
    : DEFAULT_BOARD_WORKER_WINDOW.end;
  return { start, end };
}

function clampMinutes(value: unknown, fallback: number): number {
  const minutes = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(60, Math.floor(minutes)));
}

export function normalizeClaudeEngineConfig(raw: ClaudeEngineConfig): Required<Pick<ClaudeEngineConfig, "maxLivePtys">> & ClaudeEngineConfig {
  return {
    ...raw,
    maxLivePtys: raw.maxLivePtys ?? 8,
  };
}

/**
 * Guarantee a fully-populated gateway block. The config schema treats the whole
 * `gateway` block (and `gateway.port`/`gateway.host`) as optional — "downstream
 * defaults apply" — but several runtime paths (e.g. `jinn start`) dereference
 * `config.gateway.port` / `.host` directly. Without this normalization a config
 * that omits the gateway block crashes at startup with a TypeError instead of
 * running on the defaults. Any port present here has already passed schema
 * validation; the guards are belt-and-suspenders.
 */
export function normalizeGatewayConfig(raw: JinnConfig["gateway"] | undefined): JinnConfig["gateway"] {
  const port =
    typeof raw?.port === "number" && Number.isInteger(raw.port) && raw.port >= 1 && raw.port <= 65535
      ? raw.port
      : DEFAULT_GATEWAY_PORT;
  const host = typeof raw?.host === "string" && raw.host.trim() ? raw.host : DEFAULT_GATEWAY_HOST;
  return { ...raw, port, host };
}

export function normalizeBoardWorkerConfig(raw: BoardWorkerConfig | undefined): NormalizedBoardWorkerConfig {
  const weekday = normalizeWindow(raw?.schedule?.weekday);
  const weekend = normalizeWindow(raw?.schedule?.weekend);
  return {
    enabled: raw?.enabled ?? false,
    idleMinutes: clampMinutes(raw?.idleMinutes, 5),
    timezone: raw?.timezone ?? systemTimezone(),
    schedule: { weekday, weekend },
    usage: { minRemainingPercent: raw?.usage?.minRemainingPercent ?? 15 },
  };
}

export function normalizeKnowledgeConfig(raw: KnowledgeConfig | undefined): Required<KnowledgeConfig> {
  return {
    sink: {
      type: raw?.sink?.type ?? "noop",
      jsonl: {
        path: raw?.sink?.jsonl?.path ?? KNOWLEDGE_OUTBOX_JSONL,
      },
      webhook: {
        url: raw?.sink?.webhook?.url,
        token: raw?.sink?.webhook?.token,
        batchSize: raw?.sink?.webhook?.batchSize ?? 25,
        timeoutMs: raw?.sink?.webhook?.timeoutMs ?? 10_000,
        retry: {
          baseDelayMs: raw?.sink?.webhook?.retry?.baseDelayMs ?? 1_000,
          maxDelayMs: raw?.sink?.webhook?.retry?.maxDelayMs ?? 60_000,
        },
      },
    },
    readProvider: {
      type: raw?.readProvider?.type ?? "none",
      webhook: {
        url: raw?.readProvider?.webhook?.url,
        token: raw?.readProvider?.webhook?.token,
        timeoutMs: raw?.readProvider?.webhook?.timeoutMs ?? 10_000,
      },
    },
  };
}

export function loadConfig(): JinnConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `Jinn config not found at ${CONFIG_PATH}. Run "jinn setup" first.`
    );
  }
  // config.yaml stores plaintext connector secrets (Slack/Discord/Telegram
  // bot/app/proxy tokens), so it must not be group/world-readable. Repair perms
  // on every load to harden installs created before this was enforced.
  try { fs.chmodSync(CONFIG_PATH, 0o600); } catch { /* best-effort */ }
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(`Invalid YAML in ${CONFIG_PATH}: ${(err as Error).message}`);
  }
  const problems = validateConfigShape(parsed);
  if (problems.length > 0) {
    throw new Error(
      `Invalid config at ${CONFIG_PATH}:\n  - ${problems.join("\n  - ")}`
    );
  }
  const config = parsed as JinnConfig;
  config.engines.claude = normalizeClaudeEngineConfig(config.engines.claude);
  config.gateway = normalizeGatewayConfig(config.gateway);
  config.boardWorker = normalizeBoardWorkerConfig(config.boardWorker);
  config.knowledge = normalizeKnowledgeConfig(config.knowledge);
  return config;
}

/**
 * Atomically persist a config object to config.yaml. The live gateway
 * hot-reloads config.yaml via a file watcher, so a torn write would be
 * consumed mid-write — write to a tmp file in the same directory, then rename.
 * `dumpOptions` is forwarded to yaml.dump so call sites keep their formatting.
 */
export function saveConfigAtomic(config: unknown, dumpOptions?: yaml.DumpOptions): void {
  // Atomic + fsync-durable + audited (canonical config; hot-reloaded by a
  // watcher). mode 0o600: the file holds plaintext connector secrets and must
  // not be group/world-readable.
  safeWriteYaml(CONFIG_PATH, config, { mode: 0o600, dumpOptions, audit: { actor: "gateway", op: "config.save" } });
}
