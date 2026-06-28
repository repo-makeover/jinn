import { describe, it, expect } from "vitest";
import { validateEmployeeCreate } from "../org.js";
import type { JinnConfig } from "../../shared/types.js";

const config = { engines: { default: "claude", claude: {} } } as unknown as JinnConfig;

describe("validateEmployeeCreate — department path traversal (H5)", () => {
  it("rejects a department containing '..' traversal segments", () => {
    const r = validateEmployeeCreate(
      config,
      { name: "x", displayName: "X", department: "../../../../tmp/escape", persona: "p" },
      [],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/department/);
  });

  it("rejects an absolute department path", () => {
    const r = validateEmployeeCreate(
      config,
      { name: "x", displayName: "X", department: "/etc/cron.d", persona: "p" },
      [],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/department/);
  });

  it("accepts a normal department slug", () => {
    const r = validateEmployeeCreate(
      config,
      { name: "x", displayName: "X", department: "engineering", persona: "p" },
      [],
    );
    // A plain slug passes the traversal guard (may still require other fields,
    // but must NOT be rejected for the department).
    if (!r.ok) expect(r.error).not.toMatch(/department/);
  });
});
