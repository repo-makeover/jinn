import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadOrchestrationConfig } from "../../orchestration/config.js";
import { PersistentMatrixScheduler } from "../../orchestration/persistent-scheduler.js";
import {
  runLeasesList,
  runQueueList,
  runSchedulerAllocate,
  runSchedulerPlan,
  runSchedulerSimulate,
  runWorkersList,
} from "../orchestration.js";

let tmpDir: string;
let dbPath: string;
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-orchestration-cli-"));
  dbPath = path.join(tmpDir, "orchestration.db");
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  writeConfig(tmpDir);
});

afterEach(() => {
  logSpy.mockRestore();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("orchestration CLI dry-run commands", () => {
  it("lists workers from an explicit config directory", async () => {
    await runWorkersList({ configDir: tmpDir, json: true });

    const output = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(output.workers.map((worker: { id: string }) => worker.id)).toEqual(["codexSenior", "haikuReviewer", "localQa"]);
  });

  it("dry-runs a scheduler allocation without calling providers", async () => {
    const taskFile = path.join(tmpDir, "task.yaml");
    fs.writeFileSync(taskFile, [
      "taskId: task-cli",
      "coordinatorId: coord-cli",
      "coordinatorTemplate: standardImplementation",
    ].join("\n"));

    await runSchedulerAllocate(taskFile, { configDir: tmpDir, dryRun: true, json: true });

    const output = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(output.ok).toBe(true);
    expect(output.allocation.leases.map((lease: { role: string; workerId: string }) => [lease.role, lease.workerId])).toEqual([
      ["seniorImplementer", "codexSenior"],
      ["independentReviewer", "haikuReviewer"],
      ["qaGate", "localQa"],
    ]);
  });

  it("requires --dry-run for allocate", async () => {
    const taskFile = path.join(tmpDir, "task.yaml");
    fs.writeFileSync(taskFile, [
      "taskId: task-cli",
      "coordinatorId: coord-cli",
      "coordinatorTemplate: standardImplementation",
    ].join("\n"));

    await expect(runSchedulerAllocate(taskFile, { configDir: tmpDir })).rejects.toThrow("--dry-run");
  });

  it("plans from a coordinator template without requiring --dry-run", async () => {
    const taskFile = path.join(tmpDir, "plan.yaml");
    fs.writeFileSync(taskFile, [
      "taskId: task-plan",
      "coordinatorId: coord-plan",
      "coordinatorTemplate: standardImplementation",
      "mode: single_worker_with_review",
    ].join("\n"));

    await runSchedulerPlan(taskFile, { configDir: tmpDir, json: true });

    const output = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(output.mode).toBe("single_worker_with_review");
    expect(output.request.requiredRoles).toEqual(["seniorImplementer", "independentReviewer"]);
    expect(output.summary.state).toBe("allocated");
  });

  it("lists leases and blocked queue items from an explicit orchestration db", async () => {
    const config = loadOrchestrationConfig(tmpDir);
    const scheduler = PersistentMatrixScheduler.open(config, { dbPath });
    scheduler.requestAllocation({
      taskId: "task-one",
      coordinatorId: "coord-one",
      requiredRoles: ["seniorImplementer"],
      optionalRoles: [],
      priority: "normal",
      leaseDurationMs: 60_000,
    });
    scheduler.requestAllocation({
      taskId: "task-two",
      coordinatorId: "coord-two",
      requiredRoles: ["seniorImplementer"],
      optionalRoles: [],
      priority: "high",
      leaseDurationMs: 60_000,
    });
    scheduler.close();

    await runLeasesList({ configDir: tmpDir, dbPath, json: true });
    await runQueueList({ configDir: tmpDir, dbPath, json: true });

    const leases = JSON.parse(String(logSpy.mock.calls[0][0]));
    const queue = JSON.parse(String(logSpy.mock.calls[1][0]));
    expect(leases.leases.map((lease: { taskId: string }) => lease.taskId)).toContain("task-one");
    expect(queue.queue).toMatchObject([{ taskId: "task-two", missingRoles: ["seniorImplementer"] }]);
  });

  it("simulates blocked and resumed allocation steps", async () => {
    const scenarioFile = path.join(tmpDir, "scenario.yaml");
    fs.writeFileSync(scenarioFile, [
      "name: cli scenario",
      "steps:",
      "  - allocate:",
      "      taskId: task-one",
      "      coordinatorId: coord-one",
      "      requiredRoles: [seniorImplementer]",
      "  - allocate:",
      "      taskId: task-two",
      "      coordinatorId: coord-two",
      "      requiredRoles: [seniorImplementer]",
      "  - release:",
      "      taskId: task-one",
      "      role: seniorImplementer",
      "  - expire:",
      "      now: '2026-06-23T12:00:00.000Z'",
    ].join("\n"));

    await runSchedulerSimulate(scenarioFile, { configDir: tmpDir, json: true });

    const output = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(output.steps[1].result.ok).toBe(false);
    expect(output.steps[3].result.retried[0].allocation.taskId).toBe("task-two");
  });
});

function writeConfig(dir: string): void {
  fs.writeFileSync(path.join(dir, "workers.yaml"), [
    "workers:",
    "  codexSenior:",
    "    provider: openai",
    "    family: openai",
    "    tier: frontier",
    "    capabilities: [repo_edit, coding, validation]",
    "    tools: [git, filesystem, shell]",
    "    maxConcurrentTasks: 1",
    "    costClass: high",
    "    workspacePolicy: isolated_worktree",
    "  haikuReviewer:",
    "    provider: anthropic",
    "    family: anthropic",
    "    tier: small",
    "    capabilities: [code_review]",
    "    tools: [filesystem]",
    "    maxConcurrentTasks: 1",
    "    costClass: low",
    "    workspacePolicy: read_only",
    "  localQa:",
    "    provider: ollama",
    "    family: local",
    "    tier: local",
    "    capabilities: [validation]",
    "    tools: [shell]",
    "    maxConcurrentTasks: 4",
    "    costClass: near_zero",
    "    workspacePolicy: shared",
  ].join("\n"));
  fs.writeFileSync(path.join(dir, "roles.yaml"), [
    "roles:",
    "  seniorImplementer:",
    "    requiredCapabilities: [repo_edit, coding]",
    "    requiredTools: [git, filesystem]",
    "    preferredTiers: [frontier]",
    "  independentReviewer:",
    "    requiredCapabilities: [code_review]",
    "    requiredTools: [filesystem]",
    "    familyConstraint: opposite_of_implementer",
    "    preferredCostClasses: [low]",
    "  qaGate:",
    "    requiredCapabilities: [validation]",
    "    requiredTools: [shell]",
    "    preferredCostClasses: [near_zero, low]",
  ].join("\n"));
  fs.writeFileSync(path.join(dir, "coordinators.yaml"), [
    "coordinatorTemplates:",
    "  standardImplementation:",
    "    purpose: feature work",
    "    requiredRoles: [seniorImplementer, independentReviewer, qaGate]",
    "    optionalRoles: []",
  ].join("\n"));
  fs.writeFileSync(path.join(dir, "quotas.yaml"), [
    "quotas:",
    "  providers: {}",
    "  families: {}",
  ].join("\n"));
}
