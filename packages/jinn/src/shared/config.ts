import fs from "node:fs";
import yaml from "js-yaml";
import { CONFIG_PATH } from "./paths.js";
import { safeWriteYaml } from "./safe-write.js";
import type { BoardWorkerConfig, JinnConfig } from "./types.js";

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

export function normalizeClaudeEngineConfig(raw: ClaudeEngineConfig): Required<Pick<ClaudeEngineConfig, "maxLivePtys">> & ClaudeEngineConfig {
  return {
    ...raw,
    maxLivePtys: raw.maxLivePtys ?? 8,
  };
}

export function normalizeBoardWorkerConfig(raw: BoardWorkerConfig | undefined): NormalizedBoardWorkerConfig {
  const idleMinutes = typeof raw?.idleMinutes === "number" && Number.isFinite(raw.idleMinutes)
    ? Math.min(60, Math.max(0, Math.round(raw.idleMinutes)))
    : 30;
  const minRemainingPercent = typeof raw?.usage?.minRemainingPercent === "number" && Number.isFinite(raw.usage.minRemainingPercent)
    ? Math.min(100, Math.max(0, raw.usage.minRemainingPercent))
    : 15;
  const timezone = typeof raw?.timezone === "string" && raw.timezone.trim()
    ? raw.timezone.trim()
    : systemTimezone();
  return {
    enabled: raw?.enabled ?? false,
    idleMinutes,
    timezone,
    schedule: {
      weekday: normalizeWindow(raw?.schedule?.weekday),
      weekend: normalizeWindow(raw?.schedule?.weekend),
    },
    usage: {
      minRemainingPercent,
    },
  };
}

/**
 * Lightweight shape validation for a parsed config.yaml. Returns a list of
 * problems (empty = valid). Deliberately minimal: only the fields whose
 * absence/wrong type would crash the gateway at startup are checked, so
 * configs that rely on downstream defaults keep working.
 */
export function validateConfigShape(config: unknown): string[] {
  if (config === null || config === undefined) {
    return ["file is empty or parsed to null — expected a YAML mapping"];
  }
  if (typeof config !== "object" || Array.isArray(config)) {
    return [`expected a YAML mapping, got ${Array.isArray(config) ? "an array" : typeof config}`];
  }

  const problems: string[] = [];
  const c = config as Record<string, any>;

  if (c.gateway !== undefined) {
    if (typeof c.gateway !== "object" || c.gateway === null || Array.isArray(c.gateway)) {
      problems.push("gateway must be a mapping");
    } else {
      const allowedGatewayKeys = new Set([
        "port",
        "host",
        "streaming",
        "turnStallInactivityMs",
        "turnStallCeilingMs",
        "turnStallRetries",
        "allowFileCustomPaths",
        "allowFileOpen",
        "fileReadRoots",
        "allowArbitraryFileRead",
        "exposeResolvedFilePaths",
        "userHeader",
      ]);
      const unknownGatewayKeys = Object.keys(c.gateway).filter((key) => !allowedGatewayKeys.has(key));
      if (unknownGatewayKeys.length > 0) {
        problems.push(`unknown gateway config keys: ${unknownGatewayKeys.join(", ")}`);
      }
      if (c.gateway.port !== undefined && typeof c.gateway.port !== "number") {
        problems.push(`gateway.port must be a number (got ${typeof c.gateway.port})`);
      }
      if (c.gateway.host !== undefined && typeof c.gateway.host !== "string") {
        problems.push(`gateway.host must be a string (got ${typeof c.gateway.host})`);
      }
      if (c.gateway.streaming !== undefined && typeof c.gateway.streaming !== "boolean") {
        problems.push(`gateway.streaming must be a boolean (got ${typeof c.gateway.streaming})`);
      }
      if (c.gateway.turnStallInactivityMs !== undefined && typeof c.gateway.turnStallInactivityMs !== "number") {
        problems.push(`gateway.turnStallInactivityMs must be a number (got ${typeof c.gateway.turnStallInactivityMs})`);
      }
      if (c.gateway.turnStallCeilingMs !== undefined && typeof c.gateway.turnStallCeilingMs !== "number") {
        problems.push(`gateway.turnStallCeilingMs must be a number (got ${typeof c.gateway.turnStallCeilingMs})`);
      }
      if (c.gateway.turnStallRetries !== undefined && typeof c.gateway.turnStallRetries !== "number") {
        problems.push(`gateway.turnStallRetries must be a number (got ${typeof c.gateway.turnStallRetries})`);
      }
      if (c.gateway.allowFileCustomPaths !== undefined && typeof c.gateway.allowFileCustomPaths !== "boolean") {
        problems.push(`gateway.allowFileCustomPaths must be a boolean (got ${typeof c.gateway.allowFileCustomPaths})`);
      }
      if (c.gateway.allowFileOpen !== undefined && typeof c.gateway.allowFileOpen !== "boolean") {
        problems.push(`gateway.allowFileOpen must be a boolean (got ${typeof c.gateway.allowFileOpen})`);
      }
      if (c.gateway.fileReadRoots !== undefined) {
        if (!Array.isArray(c.gateway.fileReadRoots) || c.gateway.fileReadRoots.some((v: unknown) => typeof v !== "string")) {
          problems.push("gateway.fileReadRoots must be an array of strings");
        }
      }
      if (c.gateway.allowArbitraryFileRead !== undefined && typeof c.gateway.allowArbitraryFileRead !== "boolean") {
        problems.push(`gateway.allowArbitraryFileRead must be a boolean (got ${typeof c.gateway.allowArbitraryFileRead})`);
      }
      if (c.gateway.exposeResolvedFilePaths !== undefined && typeof c.gateway.exposeResolvedFilePaths !== "boolean") {
        problems.push(`gateway.exposeResolvedFilePaths must be a boolean (got ${typeof c.gateway.exposeResolvedFilePaths})`);
      }
      if (c.gateway.userHeader !== undefined) {
        const userHeader = c.gateway.userHeader;
        const valid =
          typeof userHeader === "string" ||
          (Array.isArray(userHeader) && userHeader.every((v: unknown) => typeof v === "string"));
        if (!valid) problems.push("gateway.userHeader must be a string or array of strings");
      }
    }
  }

  if (typeof c.engines !== "object" || c.engines === null || Array.isArray(c.engines)) {
    problems.push("engines must be a mapping with at least an engines.claude entry");
  } else {
    if (c.engines.default !== undefined && typeof c.engines.default !== "string") {
      problems.push("engines.default must be a string");
    }
    if (typeof c.engines.claude !== "object" || c.engines.claude === null || Array.isArray(c.engines.claude)) {
      problems.push("engines.claude must be a mapping");
    }
    if (c.engines.kiro !== undefined) {
      if (typeof c.engines.kiro !== "object" || c.engines.kiro === null || Array.isArray(c.engines.kiro)) {
        problems.push("engines.kiro must be a mapping");
      } else {
        if (c.engines.kiro.creditBudget !== undefined && typeof c.engines.kiro.creditBudget !== "number") {
          problems.push(`engines.kiro.creditBudget must be a number (got ${typeof c.engines.kiro.creditBudget})`);
        }
        if (c.engines.kiro.billingAnchorDay !== undefined && typeof c.engines.kiro.billingAnchorDay !== "number") {
          problems.push(`engines.kiro.billingAnchorDay must be a number (got ${typeof c.engines.kiro.billingAnchorDay})`);
        }
      }
    }
  }

  if (c.boardWorker !== undefined) {
    if (typeof c.boardWorker !== "object" || c.boardWorker === null || Array.isArray(c.boardWorker)) {
      problems.push("boardWorker must be a mapping");
    } else {
      if (c.boardWorker.enabled !== undefined && typeof c.boardWorker.enabled !== "boolean") {
        problems.push(`boardWorker.enabled must be a boolean (got ${typeof c.boardWorker.enabled})`);
      }
      if (c.boardWorker.idleMinutes !== undefined && typeof c.boardWorker.idleMinutes !== "number") {
        problems.push(`boardWorker.idleMinutes must be a number (got ${typeof c.boardWorker.idleMinutes})`);
      }
      if (c.boardWorker.timezone !== undefined) {
        if (typeof c.boardWorker.timezone !== "string") {
          problems.push(`boardWorker.timezone must be a string (got ${typeof c.boardWorker.timezone})`);
        } else {
          try {
            new Intl.DateTimeFormat("en-US", { timeZone: c.boardWorker.timezone });
          } catch {
            problems.push(`boardWorker.timezone must be a valid IANA timezone (got ${c.boardWorker.timezone})`);
          }
        }
      }
      const schedule = c.boardWorker.schedule;
      if (schedule !== undefined) {
        if (typeof schedule !== "object" || schedule === null || Array.isArray(schedule)) {
          problems.push("boardWorker.schedule must be a mapping");
        } else {
          for (const key of ["weekday", "weekend"] as const) {
            const window = schedule[key];
            if (window === undefined) continue;
            if (typeof window !== "object" || window === null || Array.isArray(window)) {
              problems.push(`boardWorker.schedule.${key} must be a mapping`);
              continue;
            }
            if (typeof window.start !== "string" || !TIME_OF_DAY_RE.test(window.start)) {
              problems.push(`boardWorker.schedule.${key}.start must be HH:MM`);
            }
            if (typeof window.end !== "string" || !TIME_OF_DAY_RE.test(window.end)) {
              problems.push(`boardWorker.schedule.${key}.end must be HH:MM`);
            }
          }
        }
      }
      if (c.boardWorker.usage !== undefined) {
        if (typeof c.boardWorker.usage !== "object" || c.boardWorker.usage === null || Array.isArray(c.boardWorker.usage)) {
          problems.push("boardWorker.usage must be a mapping");
        } else if (
          c.boardWorker.usage.minRemainingPercent !== undefined &&
          typeof c.boardWorker.usage.minRemainingPercent !== "number"
        ) {
          problems.push(`boardWorker.usage.minRemainingPercent must be a number (got ${typeof c.boardWorker.usage.minRemainingPercent})`);
        }
      }
    }
  }

  return problems;
}

export function loadConfig(): JinnConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `Jinn config not found at ${CONFIG_PATH}. Run "jinn setup" first.`
    );
  }
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
  config.boardWorker = normalizeBoardWorkerConfig(config.boardWorker);
  return config;
}

/**
 * Atomically persist a config object to config.yaml. The live gateway
 * hot-reloads config.yaml via a file watcher, so a torn write would be
 * consumed mid-write — write to a tmp file in the same directory, then rename.
 * `dumpOptions` is forwarded to yaml.dump so call sites keep their formatting.
 */
export function saveConfigAtomic(config: unknown, dumpOptions?: yaml.DumpOptions): void {
  // Atomic + fsync-durable + audited (canonical config; hot-reloaded by a watcher).
  safeWriteYaml(CONFIG_PATH, config, { dumpOptions, audit: { actor: "gateway", op: "config.save" } });
}
