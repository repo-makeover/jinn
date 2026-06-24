import { afterEach, describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import {
  CONFIG_PATH,
  CRON_JOBS,
  JINN_HOME,
  getJinnPaths,
  refreshJinnPaths,
  setJinnHomeForTest,
} from "../paths.js";

const prevHome = process.env.JINN_HOME;

afterEach(() => {
  if (prevHome === undefined) delete process.env.JINN_HOME;
  else process.env.JINN_HOME = prevHome;
  refreshJinnPaths();
});

describe("Jinn runtime paths", () => {
  it("computes paths from an explicit environment without mutating exports", () => {
    const home = path.join(os.tmpdir(), "jinn-paths-explicit");
    const paths = getJinnPaths({ JINN_HOME: home });

    expect(paths.JINN_HOME).toBe(home);
    expect(paths.CONFIG_PATH).toBe(path.join(home, "config.yaml"));
    expect(paths.CRON_JOBS).toBe(path.join(home, "cron", "jobs.json"));
    expect(JINN_HOME).not.toBe(home);
  });

  it("refreshes live bindings without re-importing modules", () => {
    const home = path.join(os.tmpdir(), "jinn-paths-live");

    setJinnHomeForTest(home);

    expect(process.env.JINN_HOME).toBe(home);
    expect(JINN_HOME).toBe(home);
    expect(CONFIG_PATH).toBe(path.join(home, "config.yaml"));
    expect(CRON_JOBS).toBe(path.join(home, "cron", "jobs.json"));
  });
});
