/**
 * Entry point for the daemon child process.
 * Spawned by lifecycle.ts startDaemon().
 */
import { loadConfig } from "../shared/config.js";
import { startForeground } from "./lifecycle.js";
import { installProcessErrorHandlers } from "./process-guards.js";

// Safety-net for the daemon child (stdio is ignored here, so an unhandled
// error would otherwise vanish). startForeground installs these too, covering
// the foreground `jinn start` and systemd paths.
installProcessErrorHandlers();

const config = loadConfig();
startForeground(config).catch((err) => {
  console.error("Daemon failed to start:", err);
  process.exit(1);
});
