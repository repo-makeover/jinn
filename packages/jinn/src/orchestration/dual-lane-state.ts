import fs from "node:fs";
import path from "node:path";
import { TMP_DIR } from "../shared/paths.js";
import type { OrchestrationRunSession } from "./run-mode.js";
import type { WorktreeHandle } from "./worktree.js";

export const DUAL_LANE_STATE_DIR = path.join(TMP_DIR, "orchestration-dual-lane");

export type DualLaneState = "selection_required" | "selected" | "failed";

export interface DualLaneManifest {
  taskId: string;
  coordinatorId: string;
  state: DualLaneState;
  createdAt: string;
  updatedAt: string;
  baseCwd: string;
  promptHash: string;
  selectedLane?: "openai" | "anthropic";
  archivedLane?: "openai" | "anthropic";
  lanes: DualLaneManifestLane[];
  comparisonReport: DualLaneComparisonReport;
}

export interface DualLaneManifestLane {
  id: "openai" | "anthropic";
  role: string;
  family: "openai" | "anthropic";
  workerId: string;
  leaseId: string;
  session: OrchestrationRunSession;
  worktree: WorktreeHandle;
  archive?: DualLaneArchiveRecord;
}

export interface DualLaneArchiveRecord {
  diffPath: string;
  metadataPath: string;
  archivedAt: string;
}

export interface DualLaneComparisonReport {
  taskId: string;
  generatedAt: string;
  laneSummaries: Array<{
    laneId: "openai" | "anthropic";
    changedFiles: string[];
    addedLines: number;
    removedLines: number;
    status: string;
    error: string | null;
  }>;
  commonFiles: string[];
  uniqueFiles: Record<"openai" | "anthropic", string[]>;
  majorDifferences: string[];
}

export function writeDualLaneManifest(manifest: DualLaneManifest): void {
  const file = dualLaneManifestPath(manifest.taskId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function readDualLaneManifest(taskId: string): DualLaneManifest | undefined {
  const file = dualLaneManifestPath(taskId);
  if (!fs.existsSync(file)) return undefined;
  const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as DualLaneManifest;
  if (parsed.taskId !== taskId) throw new Error(`dual-lane manifest task mismatch: ${file}`);
  return parsed;
}

export function updateDualLaneManifest(manifest: DualLaneManifest): DualLaneManifest {
  const updated = { ...manifest, updatedAt: new Date().toISOString() };
  writeDualLaneManifest(updated);
  return updated;
}

export function listProtectedDualLaneTaskIds(root = DUAL_LANE_STATE_DIR): Set<string> {
  const protectedIds = new Set<string>();
  if (!fs.existsSync(root)) return protectedIds;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(root, entry.name, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as DualLaneManifest;
      if (manifest.state === "selection_required" || manifest.state === "selected") {
        protectedIds.add(manifest.taskId);
      }
    } catch {
      // Ignore malformed local artifacts; the worktree reaper should not fail closed.
    }
  }
  return protectedIds;
}

export function listDualLaneManifests(root = DUAL_LANE_STATE_DIR): DualLaneManifest[] {
  if (!fs.existsSync(root)) return [];
  const manifests: DualLaneManifest[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(root, entry.name, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as DualLaneManifest;
      if (manifest.taskId) manifests.push(manifest);
    } catch {
      // Ignore malformed local artifacts; observe routes report only valid manifests.
    }
  }
  return manifests.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.taskId.localeCompare(b.taskId));
}

export function dualLaneTaskDir(taskId: string): string {
  return path.join(DUAL_LANE_STATE_DIR, safeSegment(taskId));
}

export function dualLaneArchiveDir(taskId: string): string {
  return path.join(dualLaneTaskDir(taskId), "archive");
}

function dualLaneManifestPath(taskId: string): string {
  return path.join(dualLaneTaskDir(taskId), "manifest.json");
}

function safeSegment(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!safe) throw new Error(`invalid dual-lane path segment: ${value}`);
  return safe.slice(0, 80);
}
