import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Resolve the home directory for the current instance. */
export function resolveHome(env: NodeJS.ProcessEnv = process.env): string {
  if (env.JINN_HOME) return env.JINN_HOME;
  const instance = env.JINN_INSTANCE || "jinn";
  return path.join(os.homedir(), `.${instance}`);
}

export const JINN_HOME = resolveHome();
export const CONFIG_PATH = path.join(JINN_HOME, "config.yaml");
export const SESSIONS_DB = path.join(JINN_HOME, "sessions", "registry.db");
export const CRON_JOBS = path.join(JINN_HOME, "cron", "jobs.json");
export const CRON_RUNS = path.join(JINN_HOME, "cron", "runs");
export const ORG_DIR = path.join(JINN_HOME, "org");
export const SKILLS_DIR = path.join(JINN_HOME, "skills");
export const DOCS_DIR = path.join(JINN_HOME, "docs");
export const LOGS_DIR = path.join(JINN_HOME, "logs");
export const TMP_DIR = path.join(JINN_HOME, "tmp");
export const ENGINE_LIMITS_DIR = path.join(TMP_DIR, "engine-limits");
export const CLAUDE_LIMITS_DIR = path.join(ENGINE_LIMITS_DIR, "claude");
export const MODELS_DIR = path.join(JINN_HOME, "models");
export const STT_MODELS_DIR = path.join(JINN_HOME, "models", "whisper");
export const PID_FILE = path.join(JINN_HOME, "gateway.pid");
/** Gateway connection info (port + hook secret + pids) for hook-relay discovery. */
export let GATEWAY_INFO_FILE = initialPaths.GATEWAY_INFO_FILE;
/** Per-session Claude Code --settings files. */
export let CLAUDE_SETTINGS_DIR = initialPaths.CLAUDE_SETTINGS_DIR;
/** The hook-relay script written once at boot. */
export let HOOK_RELAY_SCRIPT = initialPaths.HOOK_RELAY_SCRIPT;
export let CLAUDE_SKILLS_DIR = initialPaths.CLAUDE_SKILLS_DIR;
export let AGENTS_SKILLS_DIR = initialPaths.AGENTS_SKILLS_DIR;
export let FILES_DIR = initialPaths.FILES_DIR;
/** Date-bucketed storage for files attached to / emitted by sessions. */
export let UPLOADS_DIR = initialPaths.UPLOADS_DIR;
export let MIGRATIONS_DIR = initialPaths.MIGRATIONS_DIR;

export const TEMPLATE_DIR = path.join(__dirname, "..", "..", "..", "template");
export const TEMPLATE_MIGRATIONS_DIR = path.join(TEMPLATE_DIR, "migrations");

/** Path to the global multi-instance registry. Override only for isolated tests. */
export const INSTANCES_REGISTRY = process.env.JINN_INSTANCES_REGISTRY || path.join(os.homedir(), ".jinn", "instances.json");
