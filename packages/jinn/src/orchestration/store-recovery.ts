import fs from "node:fs";
import path from "node:path";

export interface OrchestrationRecoveryManifest {
  recoveredAt: string;
  originalDbPath: string;
  corruptDbPath: string;
  corruptWalPath?: string;
  corruptShmPath?: string;
  message: string;
  operatorGuidance: string;
}

export interface OrchestrationRecoveryNotice extends OrchestrationRecoveryManifest {
  manifestPath: string;
}

export function writeRecoveryManifest(
  recoveryDir: string,
  manifest: OrchestrationRecoveryManifest,
): string {
  fs.mkdirSync(recoveryDir, { recursive: true, mode: 0o700 });
  const stamp = manifest.recoveredAt.replace(/[^0-9A-Za-z]+/g, "-").replace(/-$/, "");
  const filePath = uniqueManifestPath(path.join(recoveryDir, `${stamp}-orchestration-db-recovery.json`));
  fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  return filePath;
}

export function listRecoveryNotices(recoveryDir: string, limit = 10): OrchestrationRecoveryNotice[] {
  let names: string[];
  try {
    names = fs.readdirSync(recoveryDir).filter((name) => name.endsWith(".json"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  return names
    .sort()
    .reverse()
    .slice(0, Math.max(0, Math.floor(limit)))
    .flatMap((name) => {
      const manifestPath = path.join(recoveryDir, name);
      try {
        const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Partial<OrchestrationRecoveryManifest>;
        if (!isRecoveryManifest(parsed)) return [];
        return [{ ...parsed, manifestPath }];
      } catch {
        return [];
      }
    });
}

function uniqueManifestPath(basePath: string): string {
  let candidate = basePath;
  let index = 1;
  while (fs.existsSync(candidate)) {
    candidate = basePath.replace(/\.json$/, `-${index++}.json`);
  }
  return candidate;
}

function isRecoveryManifest(value: Partial<OrchestrationRecoveryManifest>): value is OrchestrationRecoveryManifest {
  return typeof value.recoveredAt === "string"
    && typeof value.originalDbPath === "string"
    && typeof value.corruptDbPath === "string"
    && typeof value.message === "string"
    && typeof value.operatorGuidance === "string";
}
