import { describe, it, expect, vi } from "vitest";
import { logger, configureLogger } from "../logger.js";

describe("logger log-injection neutralization (S11)", () => {
  it("indents embedded newlines so untrusted content cannot forge a new log entry", () => {
    configureLogger({ stdout: true, file: false, level: "info" });
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Attacker-influenced text trying to inject a fake top-level [ERROR] line.
    logger.info("inbound: hello\n2099-01-01T00:00:00.000Z [ERROR] forged entry");

    const line = spy.mock.calls[0]![0] as string;
    spy.mockRestore();

    // The real record starts at column 0 with timestamp + [INFO].
    expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T.*\[INFO\] inbound: hello/);
    // The injected portion is tab-indented (continuation), so it can never
    // masquerade as a real entry that starts at column 0.
    expect(line).toContain("\n\t2099-01-01T00:00:00.000Z [ERROR] forged entry");
  });
});
