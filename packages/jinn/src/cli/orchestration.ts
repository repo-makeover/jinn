import { formatZodError } from "../orchestration/schemas.js";
import { loadAllocationRequest, loadOrchestrationConfig, loadSimulationScenario } from "../orchestration/config.js";
import { MatrixScheduler, runSimulation } from "../orchestration/scheduler.js";
import type { AllocationResult, OrchestrationConfig, Worker } from "../orchestration/types.js";

export interface ConfigDirOptions {
  configDir: string;
  json?: boolean;
}

export interface SchedulerAllocateOptions extends ConfigDirOptions {
  dryRun?: boolean;
}

function requireConfigDir(opts: ConfigDirOptions): string {
  if (!opts.configDir) throw new Error("--config-dir is required");
  return opts.configDir;
}

function loadConfigForCli(opts: ConfigDirOptions): OrchestrationConfig {
  try {
    return loadOrchestrationConfig(requireConfigDir(opts));
  } catch (err) {
    throw new Error(`invalid orchestration config: ${formatZodError(err)}`);
  }
}

function print(value: unknown, json?: boolean): void {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  console.log(String(value));
}

function formatWorkers(workers: Worker[]): string {
  const lines = ["Worker              Provider     Family       Tier        Cost       Concurrency  Workspace"];
  for (const worker of workers) {
    lines.push([
      worker.id.padEnd(19),
      worker.provider.padEnd(12),
      worker.family.padEnd(12),
      worker.tier.padEnd(11),
      worker.costClass.padEnd(10),
      String(worker.maxConcurrentTasks).padEnd(12),
      worker.workspacePolicy,
    ].join(" "));
  }
  return lines.join("\n");
}

function formatAllocationResult(result: AllocationResult): string {
  if (!result.ok) {
    return [
      `Task ${result.queueItem.taskId} blocked_resource`,
      `Missing roles: ${result.queueItem.missingRoles.join(", ")}`,
      `Resume on: ${result.queueItem.resumeOn.join(", ")}`,
    ].join("\n");
  }
  const lines = [
    `Allocation ${result.allocation.allocationId}`,
    `Task: ${result.allocation.taskId}`,
    `Coordinator: ${result.allocation.coordinatorId}`,
  ];
  for (const lease of result.allocation.leases) {
    lines.push(`- ${lease.role}: ${lease.workerId} (${lease.leaseId}, expires ${lease.leaseExpiresAt})`);
  }
  if (result.allocation.optionalRolesSkipped.length > 0) {
    lines.push(`Optional roles skipped: ${result.allocation.optionalRolesSkipped.join(", ")}`);
  }
  return lines.join("\n");
}

export async function runWorkersList(opts: ConfigDirOptions): Promise<void> {
  const config = loadConfigForCli(opts);
  print(opts.json ? { workers: config.workers } : formatWorkers(config.workers), opts.json);
}

export async function runSchedulerAllocate(taskFile: string, opts: SchedulerAllocateOptions): Promise<void> {
  if (!opts.dryRun) throw new Error("scheduler allocate is inert in this slice; pass --dry-run");
  const config = loadConfigForCli(opts);
  const request = loadAllocationRequest(taskFile, config);
  const scheduler = new MatrixScheduler(config);
  const result = scheduler.requestAllocation(request);
  print(opts.json ? result : formatAllocationResult(result), opts.json);
}

export async function runSchedulerSimulate(scenarioFile: string, opts: ConfigDirOptions): Promise<void> {
  const config = loadConfigForCli(opts);
  const scenario = loadSimulationScenario(scenarioFile, config);
  const scheduler = new MatrixScheduler(config);
  const steps = runSimulation(scheduler, scenario.steps);
  const result = {
    name: scenario.name,
    steps,
    leases: scheduler.listLeases(),
    queue: scheduler.listQueue(),
  };
  print(opts.json ? result : JSON.stringify(result, null, 2), opts.json);
}

