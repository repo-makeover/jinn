import fs from "node:fs";
import { JINN_HOME } from "../shared/paths.js";
import { loadConfig } from "../shared/config.js";
import { startForeground, startDaemon, getStatus, stop, waitForPortFree, restartDetached } from "../gateway/lifecycle.js";
import { compareSemver, getPackageVersion, getInstanceVersion } from "../shared/version.js";

const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export async function runStart(opts: { daemon?: boolean; port?: number }): Promise<void> {
  if (!fs.existsSync(JINN_HOME)) {
    console.error(
      `Error: ${JINN_HOME} does not exist. Run "jinn setup" first.`
    );
    process.exit(1);
  }

  const config = loadConfig();

  // Check for pending migrations
  const instanceVersion = getInstanceVersion();
  const pkgVersion = getPackageVersion();
  if (compareSemver(instanceVersion, pkgVersion) < 0) {
    console.log(
      `${YELLOW}[migrate]${RESET} Instance is at v${instanceVersion}, CLI is v${pkgVersion}. Run ${DIM}jinn migrate${RESET} to update.`
    );
  }

  // Allow CLI --port to override config
  if (opts.port) {
    config.gateway.port = opts.port;
  }

  // If a gateway is already running, `start` becomes a clean restart instead of
  // the old racy double-boot (new daemon SIGTERMs the old, then races its
  // graceful shutdown into EADDRINUSE). Route through the same race-free path.
  if (getStatus().running) {
    if (opts.daemon) {
      restartDetached();
      console.log("Gateway already running — restarting in background.");
      return;
    }
    console.log("Gateway already running — restarting…");
    stop(config.gateway.port);
    await waitForPortFree(config.gateway.port);
    // fall through to startForeground below
  }

  if (opts.daemon) {
    startDaemon(config);
    console.log("Gateway started in background.");
  } else {
    console.log(
      `Starting gateway on ${config.gateway.host}:${config.gateway.port}...`
    );
    await startForeground(config);
  }
}
