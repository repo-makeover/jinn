import { logger } from "../shared/logger.js";

let installed = false;

/**
 * Install process-level safety nets so a single unhandled exception/rejection
 * anywhere in the single gateway process does not silently kill the whole org.
 *
 * Must cover EVERY entry path — the daemon child, the foreground `jinn start`,
 * and the systemd unit (which runs the foreground path). Idempotent.
 */
export function installProcessErrorHandlers(): void {
  if (installed) return;
  installed = true;
  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught exception: ${err?.stack ?? err}`);
    // Do NOT re-throw or exit — keep the gateway (and the whole org) alive.
  });
  process.on("unhandledRejection", (reason) => {
    const msg = reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
    logger.error(`Unhandled promise rejection: ${msg}`);
  });
}
