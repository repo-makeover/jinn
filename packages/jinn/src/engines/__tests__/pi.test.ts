import { describe, it, expect, vi, beforeEach } from "vitest";
import { PassThrough } from "node:stream";
import type { EngineResult } from "../../shared/types.js";

interface FakeProc {
  stdout: PassThrough;
  stderr: PassThrough;
  stdin: { end: () => void };
  exitCode: number | null;
  killed: boolean;
  kill: (sig?: string) => boolean;
  pid: number;
  on: (event: string, cb: (...a: any[]) => void) => FakeProc;
  _handlers: Record<string, (...a: any[]) => void>;
  emitStdout: (s: string) => void;
  emitStderr: (s: string) => void;
  close: (code: number | null) => void;
}

interface SpawnCall {
  bin: string;
  args: string[];
  opts: unknown;
  proc: FakeProc;
}

const spawnCalls: SpawnCall[] = [];

function makeFakeProc(): FakeProc {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const handlers: Record<string, (...a: any[]) => void> = {};
  const p: FakeProc = {
    stdout,
    stderr,
    stdin: { end: () => {} },
    exitCode: null,
    killed: false,
    pid: 8888,
    kill: () => {
      p.killed = true;
      return true;
    },
    _handlers: handlers,
    on(event, cb) {
      handlers[event] = cb;
      return p;
    },
    emitStdout(s) {
      stdout.write(Buffer.from(s));
    },
    emitStderr(s) {
      stderr.write(Buffer.from(s));
    },
    close(code) {
      p.exitCode = code;
      handlers.close?.(code);
    },
  };
  return p;
}

vi.mock("node:child_process", () => ({
  spawn: vi.fn((bin: string, args: string[], opts: unknown) => {
    const proc = makeFakeProc();
    spawnCalls.push({ bin, args, opts, proc });
    return proc;
  }),
}));

import { PiEngine } from "../pi.js";
import { __resetPiThrottleForTests } from "../../shared/pi-throttle.js";

const flush = () => new Promise((r) => setTimeout(r, 0));

const agentEnd = (text: string) => JSON.stringify({
  type: "agent_end",
  messages: [{
    role: "assistant",
    content: [{ type: "text", text }],
  }],
});

async function startRun(overrides: Partial<Parameters<PiEngine["run"]>[0]> = {}): Promise<{ engine: PiEngine; promise: Promise<EngineResult>; call: SpawnCall }> {
  const engine = new PiEngine();
  const promise = engine.run({
    prompt: "hello",
    cwd: "/tmp",
    sessionId: "jinn-pi-1",
    model: "ollama/gemma4:12b",
    ...overrides,
  });
  await flush();
  const call = spawnCalls[spawnCalls.length - 1]!;
  expect(call).toBeDefined();
  return { engine, promise, call };
}

beforeEach(() => {
  spawnCalls.length = 0;
  // The Pi throttle is a module-level singleton enforcing a minimum gap
  // between messages; reset it so prior runs don't delay this test's spawn.
  __resetPiThrottleForTests();
});

function envFrom(call: SpawnCall): Record<string, string> {
  return (call.opts as { env: Record<string, string> }).env;
}

describe("PiEngine lifecycle", () => {
  it("strips host secrets and engine loop variables from spawned env", async () => {
    const prevOpenAi = process.env.OPENAI_API_KEY;
    const prevClaude = process.env.CLAUDE_CODE_SESSION;
    const prevCodex = process.env.CODEX_SESSION;
    try {
      process.env.OPENAI_API_KEY = "host-secret";
      process.env.CLAUDE_CODE_SESSION = "hook";
      process.env.CODEX_SESSION = "loop";

      const { promise, call } = await startRun();
      call.proc.emitStdout(agentEnd("ok") + "\n");
      call.proc.close(0);
      await promise;

      const env = envFrom(call);
      expect(env.OPENAI_API_KEY).toBeUndefined();
      expect(env.CLAUDE_CODE_SESSION).toBeUndefined();
      expect(env.CODEX_SESSION).toBeUndefined();
    } finally {
      if (prevOpenAi === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prevOpenAi;
      if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
      else process.env.CLAUDE_CODE_SESSION = prevClaude;
      if (prevCodex === undefined) delete process.env.CODEX_SESSION;
      else process.env.CODEX_SESSION = prevCodex;
    }
  });

  it("passes Jinn context as Pi's system prompt instead of prepending it to the user prompt", async () => {
    const { promise, call } = await startRun({ systemPrompt: "SYSTEM RULES" });
    const systemPromptIndex = call.args.indexOf("--system-prompt");

    expect(systemPromptIndex).toBeGreaterThan(-1);
    expect(call.args[systemPromptIndex + 1]).toBe("SYSTEM RULES");
    expect(call.args[call.args.length - 1]).toBe("hello");

    call.proc.emitStdout(agentEnd("ok") + "\n");
    call.proc.close(0);
    await promise;
  });

  it("records agent_end output but resolves only after the process closes", async () => {
    const { promise, call } = await startRun();
    let settled = false;
    void promise.then(() => { settled = true; });

    call.proc.emitStdout(agentEnd("final answer") + "\n");
    await flush();
    expect(settled).toBe(false);

    call.proc.close(0);
    const result = await promise;
    expect(result).toMatchObject({ sessionId: "jinn-pi-1", result: "final answer" });
    expect(result.error).toBeUndefined();
  });

  it("treats exit 0 with no final assistant response as an error", async () => {
    const { promise, call } = await startRun();
    call.proc.close(0);

    const result = await promise;
    expect(result.result).toBe("");
    expect(result.error).toMatch(/without a final assistant response/);
  });

  it("does not return partial text as the result when interrupted", async () => {
    const { engine, promise, call } = await startRun();
    call.proc.emitStdout(agentEnd("partial") + "\n");
    await flush();

    engine.kill("jinn-pi-1", "Interrupted: user stopped");
    call.proc.close(null);
    const result = await promise;
    expect(result.result).toBe("");
    expect(result.error).toBe("Interrupted: user stopped");
  });
});
