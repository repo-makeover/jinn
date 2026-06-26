import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, vi } from "vitest";
import { refreshJinnPaths, setJinnHomeForTest } from "../shared/paths.js";
import { safeRmSync } from "../shared/safe-delete.js";

export interface TempJinnHomeHandle {
  home: () => string;
  setup: () => string;
  cleanup: () => void;
}

export function createTempJinnHomeForTest(prefix = "jinn-test-"): TempJinnHomeHandle {
  let previousHome: string | undefined;
  let tmpHome = "";

  return {
    home: () => tmpHome,
    setup: () => {
      previousHome = process.env.JINN_HOME;
      tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
      setJinnHomeForTest(tmpHome);
      vi.resetModules();
      return tmpHome;
    },
    cleanup: () => {
      if (previousHome === undefined) {
        delete process.env.JINN_HOME;
        refreshJinnPaths();
      } else {
        setJinnHomeForTest(previousHome);
      }
      vi.resetModules();
      safeRmSync(tmpHome, { within: os.tmpdir(), label: "temp jinn home" });
      tmpHome = "";
    },
  };
}

export function withTempJinnHome(prefix = "jinn-test-"): { home: () => string } {
  const handle = createTempJinnHomeForTest(prefix);
  beforeEach(() => {
    handle.setup();
  });
  afterEach(() => {
    handle.cleanup();
  });
  return { home: handle.home };
}

export function withStaticTempJinnHome(prefix = "jinn-test-"): { home: string } {
  const previousHome = process.env.JINN_HOME;
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  setJinnHomeForTest(home);

  afterAll(() => {
    if (previousHome === undefined) {
      delete process.env.JINN_HOME;
      refreshJinnPaths();
    } else {
      setJinnHomeForTest(previousHome);
    }
    safeRmSync(home, { within: os.tmpdir(), label: "temp jinn home" });
  });

  return { home };
}
