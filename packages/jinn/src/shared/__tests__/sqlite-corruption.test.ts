import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isSqliteCorruptionError, quarantineCorruptDb } from "../sqlite-corruption.js";

describe("isSqliteCorruptionError", () => {
  it("detects corruption by code and by message", () => {
    expect(isSqliteCorruptionError({ code: "SQLITE_CORRUPT" })).toBe(true);
    expect(isSqliteCorruptionError({ code: "SQLITE_NOTADB" })).toBe(true);
    expect(isSqliteCorruptionError(new Error("database disk image is malformed"))).toBe(true);
    expect(isSqliteCorruptionError(new Error("file is not a database"))).toBe(true);
    // Unrelated errors must NOT be treated as corruption (permissions, disk, etc).
    expect(isSqliteCorruptionError({ code: "SQLITE_BUSY" })).toBe(false);
    expect(isSqliteCorruptionError(new Error("EACCES: permission denied"))).toBe(false);
  });
});

describe("quarantineCorruptDb", () => {
  it("renames the db and its -wal/-shm sidecars aside", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-corrupt-"));
    const dbPath = path.join(dir, "registry.db");
    fs.writeFileSync(dbPath, "garbage");
    fs.writeFileSync(`${dbPath}-wal`, "wal");
    fs.writeFileSync(`${dbPath}-shm`, "shm");

    const target = quarantineCorruptDb(dbPath);

    // Originals moved aside; a fresh db can be created at the original path.
    expect(fs.existsSync(dbPath)).toBe(false);
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.existsSync(`${target}-wal`)).toBe(true);
    expect(fs.existsSync(`${target}-shm`)).toBe(true);
  });
});
