import { describe, it, expect, vi } from "vitest";

// claude-interactive.ts imports node-pty at module load; mock it so this pure
// unit test stays CI-portable (no native binding needed).
vi.mock("node-pty", () => ({ spawn: vi.fn() }));

import { sseEventToDeltas, truncatedToolInput } from "../claude-interactive.js";

describe("sseEventToDeltas (Item D — SSE → StreamDelta mapping)", () => {
  it("maps message_start.usage to a context delta (input + cache_read + cache_creation)", () => {
    const out = sseEventToDeltas({
      type: "message_start",
      message: { usage: { input_tokens: 600, cache_read_input_tokens: 10, cache_creation_input_tokens: 6 } },
    });
    expect(out).toEqual([{ type: "context", content: "616" }]);
  });

  it("emits no context delta when usage is absent or zero", () => {
    expect(sseEventToDeltas({ type: "message_start", message: {} })).toEqual([]);
    expect(sseEventToDeltas({ type: "message_start", message: { usage: { input_tokens: 0 } } })).toEqual([]);
  });

  it("maps a content_block_start tool_use to a tool_use marker (name + id)", () => {
    const out = sseEventToDeltas({
      type: "content_block_start",
      content_block: { type: "tool_use", name: "Bash", id: "toolu_123" },
    });
    expect(out).toEqual([{ type: "tool_use", content: "Bash", toolName: "Bash", toolId: "toolu_123" }]);
  });

  it("ignores text/thinking content_block_start (their content arrives via deltas)", () => {
    expect(sseEventToDeltas({ type: "content_block_start", content_block: { type: "text" } })).toEqual([]);
    expect(sseEventToDeltas({ type: "content_block_start", content_block: { type: "thinking" } })).toEqual([]);
  });

  it("maps content_block_delta text_delta to an incremental text delta (word-by-word)", () => {
    expect(sseEventToDeltas({ type: "content_block_delta", delta: { type: "text_delta", text: "PO" } }))
      .toEqual([{ type: "text", content: "PO" }]);
    expect(sseEventToDeltas({ type: "content_block_delta", delta: { type: "text_delta", text: "NG" } }))
      .toEqual([{ type: "text", content: "NG" }]);
  });

  it("ignores empty text_delta, input_json_delta and thinking_delta", () => {
    expect(sseEventToDeltas({ type: "content_block_delta", delta: { type: "text_delta", text: "" } })).toEqual([]);
    expect(sseEventToDeltas({ type: "content_block_delta", delta: { type: "input_json_delta", partial_json: "{" } })).toEqual([]);
    expect(sseEventToDeltas({ type: "content_block_delta", delta: { type: "thinking_delta", thinking: "hmm" } })).toEqual([]);
  });

  it("ignores lifecycle-only events (ping, content_block_stop, message_delta, message_stop)", () => {
    for (const type of ["ping", "content_block_stop", "message_delta", "message_stop"]) {
      expect(sseEventToDeltas({ type })).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// truncatedToolInput — used by the PreToolUse hook handler to carry a short
// input snippet on the second tool_use delta so Talk whispers can differentiate.
//
// NOTE: the PreToolUse hook fires inside run() which spawns a PTY; that path is
// not unit-testable in isolation (requires a live PTY + engine session). The
// helper is extracted and tested here; the plumbing relies on the type guarantee
// (StreamDelta.input) and frontend integration tests (talk-whisper.test.ts).
// ---------------------------------------------------------------------------
describe("truncatedToolInput", () => {
  it("stringifies a JSON object and returns first 200 chars", () => {
    const input = { command: "curl -X POST http://localhost:7777/api/talk/delegate -d '{}'" };
    const result = truncatedToolInput(input);
    expect(result).toBe(JSON.stringify(input).slice(0, 200));
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it("passes a string through untouched (up to 200 chars)", () => {
    expect(truncatedToolInput("hello world")).toBe("hello world");
  });

  it("truncates long inputs to exactly maxChars", () => {
    const long = "x".repeat(500);
    expect(truncatedToolInput(long)).toHaveLength(200);
    expect(truncatedToolInput(long, 50)).toHaveLength(50);
  });

  it("returns empty string for null/undefined/number/boolean", () => {
    expect(truncatedToolInput(null)).toBe("");
    expect(truncatedToolInput(undefined)).toBe("");
    expect(truncatedToolInput(42)).toBe("");
    expect(truncatedToolInput(true)).toBe("");
  });

  it("preserves /api/talk/* paths inside object inputs (needed for whisper matching)", () => {
    const obj = { url: "http://host/api/talk/delegate", body: "{}" };
    const result = truncatedToolInput(obj);
    expect(result.toLowerCase()).toContain("/api/talk/delegate");
  });
});
