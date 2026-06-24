import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendOrchestrationTelemetry,
  computeWorkerScores,
  readOrchestrationTelemetry,
  summarizeOrchestrationTelemetry,
  telemetryCountsFromDiff,
  type OrchestrationRunTelemetryRecord,
} from "../telemetry.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-orch-telemetry-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("orchestration telemetry", () => {
  it("appends sanitized JSONL with private file mode where supported", () => {
    const logPath = path.join(tmpDir, "orchestration-telemetry.jsonl");

    appendOrchestrationTelemetry({
      ...record({ worker_id: "worker-a" }),
      prompt: "do not persist raw prompt",
      cwd: "/tmp/secret-path",
    } as OrchestrationRunTelemetryRecord, { logPath });

    const raw = fs.readFileSync(logPath, "utf-8");
    expect(raw).not.toContain("raw prompt");
    expect(raw).not.toContain("secret-path");
    const parsed = JSON.parse(raw);
    expect(parsed.worker_id).toBe("worker-a");
    if (process.platform !== "win32") {
      expect((fs.statSync(logPath).mode & 0o777).toString(8)).toBe("600");
    }
  });

  it("reads corrupt-line-tolerant telemetry and summarizes by provider family role and worker", () => {
    const logPath = path.join(tmpDir, "runs.jsonl");
    fs.writeFileSync(logPath, [
      JSON.stringify(record({ provider: "mock", family: "local", role: "implementer", worker_id: "worker-a", cost: 0.25 })),
      "{not-json",
      JSON.stringify(record({ provider: "claude", family: "anthropic", role: "reviewer", worker_id: "worker-b", disposition: "failed" })),
      "",
    ].join("\n"));

    const read = readOrchestrationTelemetry(logPath);
    const summary = summarizeOrchestrationTelemetry(read);

    expect(read.skippedLines).toBe(1);
    expect(summary.totals.count).toBe(2);
    expect(summary.byProvider.mock.count).toBe(1);
    expect(summary.byFamily.anthropic.dispositions.failed).toBe(1);
    expect(summary.byRole.reviewer.score).toBeLessThan(0);
    expect(summary.byWorker["worker-a"].avgCost).toBe(0.25);
  });

  it("computes deterministic worker scores with failure degradation", () => {
    const scores = computeWorkerScores([
      record({ worker_id: "winner", disposition: "completed" }),
      record({ worker_id: "winner", disposition: "selected" }),
      record({ worker_id: "loser", disposition: "failed" }),
      record({ worker_id: "loser", disposition: "completed", regressions: 1 }),
    ]);

    expect(scores.winner).toBe(3);
    expect(scores.loser).toBe(-3);
  });

  it("counts changed files and test files without exposing paths", () => {
    const counts = telemetryCountsFromDiff([
      "diff --git a/src/a.ts b/src/a.ts",
      "+++ b/src/a.ts",
      "diff --git a/src/a.test.ts b/src/a.test.ts",
      "+++ b/src/a.test.ts",
      "Untracked files:",
      "  docs/readme.md",
      "",
    ].join("\n"));

    expect(counts).toEqual({ filesChanged: 3, testsAdded: 1 });
  });
});

function record(overrides: Partial<OrchestrationRunTelemetryRecord> = {}): OrchestrationRunTelemetryRecord {
  return {
    task_id: "task-1",
    coordinator_id: "coord-1",
    session_id: "session-1",
    lease_id: "lease-1",
    worker_id: "worker-1",
    provider: "mock",
    family: "local",
    model: null,
    role: "implementer",
    mode: "single_worker",
    source: "orchestration",
    cost: null,
    latency_ms: 100,
    tokens: 1000,
    files_changed: null,
    tests_added: null,
    tests_passed: null,
    review_blockers: null,
    human_edits: null,
    regressions: null,
    disposition: "completed",
    timestamp: "2026-06-24T00:00:00.000Z",
    ...overrides,
  };
}
