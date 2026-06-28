import fs from "node:fs";
import { logger } from "./logger.js";

/** True when a better-sqlite3 error indicates the database file is corrupt / not a DB. */
export function isSqliteCorruptionError(err: unknown): boolean {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code) : "";
  if (code === "SQLITE_CORRUPT" || code === "SQLITE_NOTADB") return true;
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return message.includes("database disk image is malformed")
    || message.includes("file is not a database")
    || message.includes("not a database");
}

/**
 * Rename a corrupt SQLite database (and its -wal/-shm sidecars) aside so the
 * caller can recreate a fresh one instead of crashing the process on boot.
 * Returns the quarantine path. Best-effort; logs loudly.
 */
export function quarantineCorruptDb(dbPath: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = `${dbPath}.corrupt.${stamp}`;
  for (const suffix of ["", "-wal", "-shm"]) {
    const src = `${dbPath}${suffix}`;
    if (fs.existsSync(src)) {
      try {
        fs.renameSync(src, `${target}${suffix}`);
      } catch {
        /* best effort — a sidecar that can't be moved is non-fatal */
      }
    }
  }
  logger.error(`Quarantined corrupt SQLite database ${dbPath} -> ${target}; starting fresh.`);
  return target;
}
