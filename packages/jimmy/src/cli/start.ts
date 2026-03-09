import fs from "node:fs";
import { JINN_HOME } from "../shared/paths.js";
import { loadConfig } from "../shared/config.js";
import { startForeground, startDaemon } from "../gateway/lifecycle.js";

export async function runStart(opts: { daemon?: boolean; port?: number }): Promise<void> {
  if (!fs.existsSync(JINN_HOME)) {
    console.error(
      `Error: ${JINN_HOME} does not exist. Run "jinn setup" first.`
    );
    process.exit(1);
  }

  const config = loadConfig();

  // Allow CLI --port to override config
  if (opts.port) {
    config.gateway.port = opts.port;
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
