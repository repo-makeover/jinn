#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import os from "node:os";
import pkg from "../package.json" with { type: "json" };

const program = new Command();
program
  .name("jinn")
  .description("Lightweight AI gateway daemon")
  .version(pkg.version)
  .option("-i, --instance <name>", "Target a specific instance (default: jinn)");

// Pre-parse to set JINN_HOME before any module imports resolve paths
program.hook("preAction", (thisCommand) => {
  const opts = thisCommand.opts();
  if (opts.instance) {
    process.env.JINN_INSTANCE = opts.instance;
    process.env.JINN_HOME = path.join(os.homedir(), `.${opts.instance}`);
  }
});

program
  .command("setup")
  .description("Initialize Jinn and install dependencies")
  .option("--force", "Delete existing home dir and reinitialize from scratch")
  .action(async (opts) => {
    const { runSetup } = await import("../src/cli/setup.js");
    await runSetup(opts);
  });

program
  .command("start")
  .description("Start the gateway daemon")
  .option("--daemon", "Run in background")
  .option("-p, --port <port>", "Override the gateway port from config")
  .action(async (opts) => {
    const { runStart } = await import("../src/cli/start.js");
    await runStart({ daemon: opts.daemon, port: opts.port ? parseInt(opts.port, 10) : undefined });
  });

program
  .command("stop")
  .description("Stop the gateway daemon")
  .option("-p, --port <port>", "Port to kill the process on (default: from config or 7777)")
  .action(async (opts: { port?: string }) => {
    const { runStop } = await import("../src/cli/stop.js");
    await runStop(opts.port ? parseInt(opts.port, 10) : undefined);
  });

program
  .command("restart")
  .description("Restart the gateway (detached — safe to run from inside a session)")
  .action(async () => {
    const { runRestart } = await import("../src/cli/restart.js");
    await runRestart();
  });

program
  .command("status")
  .description("Show gateway status")
  .action(async () => {
    const { runStatus } = await import("../src/cli/status.js");
    await runStatus();
  });

program
  .command("run")
  .description("Run an opt-in matrix orchestration task through the live gateway")
  .requiredOption("--mode <mode>", "Run mode: single_worker, single_worker_with_review, dual_lane, architecture, or local_heavy")
  .requiredOption("--task <file>", "YAML task file containing prompt and allocation fields")
  .option("--json", "Print raw JSON")
  .action(async (opts: { mode: string; task: string; json?: boolean }) => {
    const { runOrchestrationRun } = await import("../src/cli/orchestration.js");
    await runOrchestrationRun(opts);
  });

{
  const dualLaneCmd = program
    .command("dual-lane")
    .description("Select the winning matrix-orchestration dual lane");

  dualLaneCmd
    .command("select")
    .requiredOption("--task-id <id>", "Dual-lane task id")
    .requiredOption("--winner <lane>", "Winning lane: openai or anthropic")
    .option("--json", "Print raw JSON")
    .action(async (opts: { taskId: string; winner: string; json?: boolean }) => {
      const { runDualLaneSelect } = await import("../src/cli/orchestration.js");
      await runDualLaneSelect(opts);
    });

  dualLaneCmd
    .command("apply")
    .requiredOption("--task-id <id>", "Dual-lane task id")
    .requiredOption("--winner <lane>", "Winning lane: openai or anthropic")
    .option("--json", "Print raw JSON")
    .action(async (opts: { taskId: string; winner: string; json?: boolean }) => {
      const { runDualLaneApply } = await import("../src/cli/orchestration.js");
      await runDualLaneApply(opts);
    });
}

{
  const startupCmd = program
    .command("startup")
    .description("Manage automatic startup (Linux/systemd user service)");

  startupCmd
    .command("enable")
    .description("Start this Jinn instance automatically when your user session starts")
    .action(async () => {
      const { runStartupEnable } = await import("../src/cli/startup.js");
      await runStartupEnable();
    });

  startupCmd
    .command("disable")
    .description("Disable automatic startup for this Jinn instance")
    .action(async () => {
      const { runStartupDisable } = await import("../src/cli/startup.js");
      await runStartupDisable();
    });

  startupCmd
    .command("status")
    .description("Show automatic startup status for this Jinn instance")
    .action(async () => {
      const { runStartupStatus } = await import("../src/cli/startup.js");
      await runStartupStatus();
    });
}

program
  .command("limits")
  .description("Show engine rate limits, quota windows, and model capabilities")
  .option("-e, --engine <name>", "Only show one engine")
  .option("--json", "Print raw JSON")
  .action(async (opts: { engine?: string; json?: boolean }) => {
    const { runLimits } = await import("../src/cli/limits.js");
    await runLimits(opts);
  });

{
  const continuationsCmd = program
    .command("continuations")
    .description("Inspect or resume durable orchestration continuations through the live gateway");

  continuationsCmd
    .command("list")
    .option("--json", "Print raw JSON")
    .action(async (opts: { json?: boolean }) => {
      const { runContinuationsList } = await import("../src/cli/orchestration.js");
      await runContinuationsList(opts);
    });

  continuationsCmd
    .command("retry")
    .requiredOption("--task-id <id>", "Task id of the failed continuation")
    .requiredOption("--coordinator-id <id>", "Coordinator id of the failed continuation")
    .option("--json", "Print raw JSON")
    .action(async (opts: { taskId: string; coordinatorId: string; json?: boolean }) => {
      const { runContinuationRetry } = await import("../src/cli/orchestration.js");
      await runContinuationRetry(opts);
    });
}

{
  const recoveryCmd = program
    .command("recovery")
    .description("Inspect read-only orchestration recovery notices");

  recoveryCmd
    .command("notices")
    .option("--json", "Print raw JSON")
    .action(async (opts: { json?: boolean }) => {
      const { runRecoveryNotices } = await import("../src/cli/orchestration.js");
      await runRecoveryNotices(opts);
    });

  recoveryCmd
    .command("requeue")
    .requiredOption("--manifest <path>", "Recovery manifest path")
    .requiredOption("--task-id <id>", "Recovered task id to import")
    .requiredOption("--manager-name <name>", "Manager or executive authorizing the import")
    .option("--json", "Print raw JSON")
    .action(async (opts: { manifest: string; taskId: string; managerName: string; json?: boolean }) => {
      const { runRecoveryRequeue } = await import("../src/cli/orchestration.js");
      await runRecoveryRequeue(opts);
    });
}

{
  const workersCmd = program
    .command("workers")
    .description("Inspect inert matrix-orchestration worker configs");

  workersCmd
    .command("list")
    .requiredOption("--config-dir <dir>", "Directory containing workers.yaml, roles.yaml, and coordinators.yaml")
    .option("--json", "Print raw JSON")
    .action(async (opts: { configDir: string; json?: boolean }) => {
      const { runWorkersList } = await import("../src/cli/orchestration.js");
      await runWorkersList(opts);
    });
}

{
  const leasesCmd = program
    .command("leases")
    .description("Inspect observe-only matrix-orchestration leases");

  leasesCmd
    .command("list")
    .requiredOption("--config-dir <dir>", "Directory containing orchestration config YAML files")
    .option("--db-path <path>", "Orchestration SQLite DB path (defaults to this instance's orchestration.db)")
    .option("--json", "Print raw JSON")
    .action(async (opts: { configDir: string; dbPath?: string; json?: boolean }) => {
      const { runLeasesList } = await import("../src/cli/orchestration.js");
      await runLeasesList(opts);
    });
}

{
  const queueCmd = program
    .command("queue")
    .description("Inspect observe-only matrix-orchestration queue state");

  queueCmd
    .command("list")
    .requiredOption("--config-dir <dir>", "Directory containing orchestration config YAML files")
    .option("--db-path <path>", "Orchestration SQLite DB path (defaults to this instance's orchestration.db)")
    .option("--json", "Print raw JSON")
    .action(async (opts: { configDir: string; dbPath?: string; json?: boolean }) => {
      const { runQueueList } = await import("../src/cli/orchestration.js");
      await runQueueList(opts);
    });

  queueCmd
    .command("pause-task")
    .requiredOption("--task-id <id>", "Queued task id")
    .requiredOption("--coordinator-id <id>", "Queued coordinator id")
    .option("--reason <text>", "Pause reason")
    .option("--manager-name <name>", "Manager name for audit metadata")
    .option("--json", "Print raw JSON")
    .action(async (opts: { taskId: string; coordinatorId: string; reason?: string; managerName?: string; json?: boolean }) => {
      const { runQueuePauseTask } = await import("../src/cli/orchestration.js");
      await runQueuePauseTask(opts);
    });

  queueCmd
    .command("resume-task")
    .requiredOption("--task-id <id>", "Queued task id")
    .requiredOption("--coordinator-id <id>", "Queued coordinator id")
    .option("--json", "Print raw JSON")
    .action(async (opts: { taskId: string; coordinatorId: string; json?: boolean }) => {
      const { runQueueResumeTask } = await import("../src/cli/orchestration.js");
      await runQueueResumeTask(opts);
    });
}

{
  const holdsCmd = program
    .command("holds")
    .description("Manage TTL-bounded matrix-orchestration holds");

  holdsCmd
    .command("list")
    .option("--json", "Print raw JSON")
    .action(async (opts: { json?: boolean }) => {
      const { runHoldsList } = await import("../src/cli/orchestration.js");
      await runHoldsList(opts);
    });

  holdsCmd
    .command("create")
    .requiredOption("--manager-name <name>", "Manager or executive authorizing the hold")
    .option("--role <role...>", "Role(s) requested by the hold")
    .option("--worker-id <id...>", "Worker id(s) reserved by the hold")
    .option("--task-id <id>", "Optional task id associated with the hold")
    .option("--coordinator-id <id>", "Optional coordinator id associated with the hold")
    .option("--reason <text>", "Hold reason")
    .option("--ttl-ms <ms>", "Hold TTL in milliseconds", Number)
    .option("--json", "Print raw JSON")
    .action(async (opts: { managerName: string; role?: string[]; workerId?: string[]; taskId?: string; coordinatorId?: string; reason?: string; ttlMs?: number; json?: boolean }) => {
      const { runHoldsCreate } = await import("../src/cli/orchestration.js");
      await runHoldsCreate(opts);
    });

  holdsCmd
    .command("extend")
    .requiredOption("--hold-id <id>", "Hold id")
    .requiredOption("--manager-name <name>", "Manager or executive that owns the hold")
    .option("--ttl-ms <ms>", "New hold TTL in milliseconds", Number)
    .option("--json", "Print raw JSON")
    .action(async (opts: { holdId: string; managerName: string; ttlMs?: number; json?: boolean }) => {
      const { runHoldsExtend } = await import("../src/cli/orchestration.js");
      await runHoldsExtend(opts);
    });

  holdsCmd
    .command("cancel")
    .requiredOption("--hold-id <id>", "Hold id")
    .requiredOption("--manager-name <name>", "Manager or executive that owns the hold")
    .option("--json", "Print raw JSON")
    .action(async (opts: { holdId: string; managerName: string; json?: boolean }) => {
      const { runHoldsCancel } = await import("../src/cli/orchestration.js");
      await runHoldsCancel(opts);
    });
}

{
  const artifactsCmd = program
    .command("artifacts")
    .description("View raw orchestration artifacts");

  artifactsCmd
    .command("view")
    .requiredOption("--task-id <id>", "Task id")
    .requiredOption("--kind <kind>", "Artifact kind: diff, prompt, or output")
    .option("--json", "Print raw JSON")
    .action(async (opts: { taskId: string; kind: "diff" | "prompt" | "output"; json?: boolean }) => {
      const { runArtifactsView } = await import("../src/cli/orchestration.js");
      await runArtifactsView(opts);
    });
}

{
  const schedulerCmd = program
    .command("scheduler")
    .description("Dry-run inert matrix scheduler allocation scenarios");

  schedulerCmd
    .command("allocate <task-file>")
    .requiredOption("--config-dir <dir>", "Directory containing orchestration config YAML files")
    .option("--dry-run", "Plan an allocation without running providers")
    .option("--json", "Print raw JSON")
    .action(async (taskFile: string, opts: { configDir: string; dryRun?: boolean; json?: boolean }) => {
      const { runSchedulerAllocate } = await import("../src/cli/orchestration.js");
      await runSchedulerAllocate(taskFile, opts);
    });

  schedulerCmd
    .command("plan <task-file>")
    .requiredOption("--config-dir <dir>", "Directory containing orchestration config YAML files")
    .option("--db-path <path>", "Orchestration SQLite DB path to account for existing leases/queue")
    .option("--json", "Print raw JSON")
    .action(async (taskFile: string, opts: { configDir: string; dbPath?: string; json?: boolean }) => {
      const { runSchedulerPlan } = await import("../src/cli/orchestration.js");
      await runSchedulerPlan(taskFile, opts);
    });

  schedulerCmd
    .command("simulate <scenario-file>")
    .requiredOption("--config-dir <dir>", "Directory containing orchestration config YAML files")
    .option("--json", "Print raw JSON")
    .action(async (scenarioFile: string, opts: { configDir: string; json?: boolean }) => {
      const { runSchedulerSimulate } = await import("../src/cli/orchestration.js");
      await runSchedulerSimulate(scenarioFile, opts);
    });

  schedulerCmd
    .command("stats")
    .option("--path <file>", "Telemetry JSONL path (defaults to this instance's logs/orchestration-telemetry.jsonl)")
    .option("--json", "Print raw JSON")
    .action(async (opts: { path?: string; json?: boolean }) => {
      const { runSchedulerStats } = await import("../src/cli/orchestration.js");
      await runSchedulerStats(opts);
    });
}

{
  const worktreeCmd = program
    .command("worktree")
    .description("Manage matrix-orchestration git worktrees");

  worktreeCmd
    .command("create <task-file>")
    .option("--lane <name>", "Worktree lane name (default: implementation)")
    .option("--json", "Print raw JSON")
    .action(async (taskFile: string, opts: { lane?: string; json?: boolean }) => {
      const { runWorktreeCreate } = await import("../src/cli/orchestration.js");
      await runWorktreeCreate(taskFile, opts);
    });

  worktreeCmd
    .command("diff <task-file>")
    .option("--lane <name>", "Worktree lane name (default: implementation)")
    .option("--json", "Print raw JSON")
    .action(async (taskFile: string, opts: { lane?: string; json?: boolean }) => {
      const { runWorktreeDiff } = await import("../src/cli/orchestration.js");
      await runWorktreeDiff(taskFile, opts);
    });

  worktreeCmd
    .command("cleanup <task-file>")
    .option("--lane <name>", "Worktree lane name (default: implementation)")
    .option("--json", "Print raw JSON")
    .action(async (taskFile: string, opts: { lane?: string; json?: boolean }) => {
      const { runWorktreeCleanup } = await import("../src/cli/orchestration.js");
      await runWorktreeCleanup(taskFile, opts);
    });
}

program
  .command("create <name>")
  .description("Create a new Jinn instance")
  .option("-p, --port <port>", "Set gateway port (auto-assigned if omitted)")
  .action(async (name: string, opts: { port?: string }) => {
    const { runCreate } = await import("../src/cli/create.js");
    await runCreate(name, opts.port ? parseInt(opts.port, 10) : undefined);
  });

program
  .command("list")
  .description("List all Jinn instances")
  .action(async () => {
    const { runList } = await import("../src/cli/list.js");
    await runList();
  });

program
  .command("remove <name>")
  .description("Remove a Jinn instance from the registry")
  .option("--force", "Also delete the instance home directory")
  .action(async (name: string, opts: { force?: boolean }) => {
    const { runRemove } = await import("../src/cli/remove.js");
    await runRemove(name, opts);
  });

program
  .command("nuke [name]")
  .description("Permanently delete a Jinn instance and all its data")
  .action(async (name?: string) => {
    const { runNuke } = await import("../src/cli/nuke.js");
    await runNuke(name);
  });

program
  .command("migrate")
  .description("Apply pending template migrations to update this instance")
  .option("--check", "Only check for pending migrations, don't apply")
  .option("--auto", "Apply safe changes automatically without launching AI")
  .action(async (opts) => {
    const { runMigrate } = await import("../src/cli/migrate.js");
    await runMigrate(opts);
  });

// Skills subcommands (jinn skills find|add|remove|list|update|restore)
{
  const skillsCmd = program
    .command("skills")
    .description("Manage skills from the skills.sh registry");

  skillsCmd
    .command("find [query]")
    .description("Search the skills.sh registry")
    .action(async (query?: string) => {
      const { skillsFind } = await import("../src/cli/skills.js");
      skillsFind(query);
    });

  skillsCmd
    .command("add <package>")
    .description("Install a skill from skills.sh")
    .action(async (pkg: string) => {
      const { skillsAdd } = await import("../src/cli/skills.js");
      skillsAdd(pkg);
    });

  skillsCmd
    .command("remove <name>")
    .description("Remove a skill from this instance")
    .action(async (name: string) => {
      const { skillsRemove } = await import("../src/cli/skills.js");
      skillsRemove(name);
    });

  skillsCmd
    .command("list")
    .description("List installed skills")
    .action(async () => {
      const { skillsList } = await import("../src/cli/skills.js");
      skillsList();
    });

  skillsCmd
    .command("update")
    .description("Re-install all skills to get latest versions")
    .action(async () => {
      const { skillsUpdate } = await import("../src/cli/skills.js");
      skillsUpdate();
    });

  skillsCmd
    .command("restore")
    .description("Install all skills listed in skills.json")
    .action(async () => {
      const { skillsRestore } = await import("../src/cli/skills.js");
      skillsRestore();
    });
}

program.parse();
