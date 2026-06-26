import { describe, it, expect, afterEach } from "vitest";
import { withStaticTempJinnHome } from "../../test-utils/jinn-home.js";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

// Point JINN_HOME at a temp dir BEFORE importing the module under test so
// PID_FILE resolves inside it.
const { home: tmpHome } = withStaticTempJinnHome("jinn-lifecycle-stop-");

const { stop, stopAndWait, getStatus } = await import("../lifecycle.js");
const { PID_FILE, CONFIG_PATH } = await import("../../shared/paths.js");

/** Pick a free ephemeral port (nothing will be listening on it afterwards). */
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

/** Spawn a child that exits `delayMs` after receiving SIGTERM (simulating graceful shutdown). */
function spawnSlowShutdownChild(delayMs: number): ChildProcess {
  const script = `process.on("SIGTERM", () => setTimeout(() => process.exit(0), ${delayMs})); setInterval(() => {}, 1000);`;
  return spawn(process.execPath, ["-e", script], { stdio: "ignore" });
}

/**
 * Spawn a child that listens on `port` and prints "ready" once bound. It has NO
 * SIGTERM handler, so if anything (incorrectly) signals it, the default action
 * terminates it and the test can detect that via exitCode/signalCode.
 */
function spawnListenerChild(port: number): ChildProcess {
  const script = `const net = require("net"); const srv = net.createServer(() => {}); srv.listen(${port}, "127.0.0.1", () => console.log("ready")); setInterval(() => {}, 1000);`;
  return spawn(process.execPath, ["-e", script], { stdio: ["ignore", "pipe", "ignore"] });
}

function waitForReady(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    let buf = "";
    child.stdout?.on("data", (chunk) => {
      buf += String(chunk);
      if (buf.includes("ready")) resolve();
    });
    child.once("error", reject);
    child.once("exit", () => reject(new Error("listener child exited before becoming ready")));
  });
}

function waitForSpawn(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once("spawn", () => resolve());
    child.once("error", reject);
  });
}

function waitForExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", () => resolve()));
}

describe("stop / stopAndWait PID-file race", () => {
  const children: ChildProcess[] = [];

  afterEach(async () => {
    for (const child of children.splice(0)) {
      try {
        child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
      await waitForExit(child);
    }
    fs.rmSync(PID_FILE, { force: true });
    fs.rmSync(CONFIG_PATH, { force: true });
  });

  it("stop() leaves the PID file in place while the process is still shutting down", async () => {
    const child = spawnSlowShutdownChild(500);
    children.push(child);
    await waitForSpawn(child);
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, String(child.pid));

    const stopped = stop(await freePort());
    expect(stopped).toBe(true);
    // The fix: no early unlink — a concurrent start/status must keep seeing
    // the (still running) gateway until it actually exits.
    expect(fs.existsSync(PID_FILE)).toBe(true);
    expect(child.exitCode).toBe(null); // still shutting down

    await waitForExit(child);
  });

  it("stopAndWait() waits for the process to exit, then removes the PID file", async () => {
    const child = spawnSlowShutdownChild(300);
    children.push(child);
    await waitForSpawn(child);
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, String(child.pid));

    const stopped = await stopAndWait(await freePort(), 5_000);
    expect(stopped).toBe(true);
    // Process must be gone by the time stopAndWait resolves…
    expect(() => process.kill(child.pid!, 0)).toThrow();
    // …and only then is the PID file removed.
    expect(fs.existsSync(PID_FILE)).toBe(false);
  });

  it("stop() cleans up a stale PID file and reports not running", async () => {
    const child = spawnSlowShutdownChild(0);
    children.push(child);
    await waitForSpawn(child);
    const deadPid = child.pid!;
    child.kill("SIGKILL");
    await waitForExit(child);

    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, String(deadPid));

    const stopped = stop(await freePort());
    expect(stopped).toBe(false);
    expect(fs.existsSync(PID_FILE)).toBe(false);
  });
});

describe("ownership boundary: never SIGTERM a process found only by port scan", () => {
  const children: ChildProcess[] = [];

  afterEach(async () => {
    for (const child of children.splice(0)) {
      try {
        child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
      await waitForExit(child);
    }
    fs.rmSync(PID_FILE, { force: true });
    fs.rmSync(CONFIG_PATH, { force: true });
  });

  it("stop() refuses to SIGTERM a port squatter this instance does not own (no PID file)", async () => {
    const port = await freePort();
    const child = spawnListenerChild(port);
    children.push(child);
    await waitForReady(child);

    // This instance owns nothing — there is no PID file on disk.
    expect(fs.existsSync(PID_FILE)).toBe(false);

    const stopped = stop(port);
    // Nothing owned → nothing stopped. Crucially, the listener (which could be a
    // side-by-side install or an unrelated service) must survive.
    expect(stopped).toBe(false);
    await new Promise((r) => setTimeout(r, 200)); // let any errant signal land
    expect(child.exitCode).toBe(null);
    expect(child.signalCode).toBe(null);
  });

  it("stop() refuses the port squatter when the PID file is stale (points at a dead process)", async () => {
    const port = await freePort();
    const child = spawnListenerChild(port);
    children.push(child);
    await waitForReady(child);

    // A dead PID in the file: ownership is gone, and the port is held by the
    // unrelated listener — which must NOT inherit the SIGTERM.
    const dead = spawnSlowShutdownChild(0);
    await waitForSpawn(dead);
    const deadPid = dead.pid!;
    dead.kill("SIGKILL");
    await waitForExit(dead);
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, String(deadPid));

    const stopped = stop(port);
    expect(stopped).toBe(false);
    expect(fs.existsSync(PID_FILE)).toBe(false); // stale file cleaned up
    await new Promise((r) => setTimeout(r, 200));
    expect(child.exitCode).toBe(null);
    expect(child.signalCode).toBe(null);
  });

  it("getStatus() reports an unowned occupied port as an error, not as running", async () => {
    const port = await freePort();
    const child = spawnListenerChild(port);
    children.push(child);
    await waitForReady(child);

    // Minimal config so resolvePort() points getStatus() at the squatter's port.
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(
      CONFIG_PATH,
      `engines:\n  claude:\n    bin: claude\n    model: opus\ngateway:\n  port: ${port}\n  host: 127.0.0.1\n`,
    );
    expect(fs.existsSync(PID_FILE)).toBe(false);

    const status = getStatus();
    // Must not adopt the unowned process as "our" running gateway.
    expect(status.running).toBe(false);
    expect(status.pid).toBe(null);
    expect(status.error).toBeDefined();
    expect(status.error).toContain(`Port ${port}`);
    expect(child.exitCode).toBe(null); // status must never signal anything
  });
});
