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
  .requiredOption("--mode <mode>", "Run mode: single_worker or single_worker_with_review")
  .requiredOption("--task <file>", "YAML task file containing prompt and allocation fields")
  .option("--json", "Print raw JSON")
  .action(async (opts: { mode: string; task: string; json?: boolean }) => {
    const { runOrchestrationRun } = await import("../src/cli/orchestration.js");
    await runOrchestrationRun(opts);
  });

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
