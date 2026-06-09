import { describe, it, expect, vi } from "vitest";

vi.mock("node-pty", () => ({ spawn: vi.fn() }));

import { codexTranscriptLineToDeltas } from "../codex-interactive.js";

describe("CodexInteractiveEngine transcript parsing", () => {
  it("extracts the session id from session_meta", () => {
    const parsed = codexTranscriptLineToDeltas(JSON.stringify({
      type: "session_meta",
      payload: { id: "codex-session-1" },
    }));
    expect(parsed.sessionId).toBe("codex-session-1");
    expect(parsed.deltas).toEqual([]);
  });

  it("maps assistant messages to text deltas and doneText", () => {
    const parsed = codexTranscriptLineToDeltas(JSON.stringify({
      type: "response_item",
      payload: {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "done" }],
      },
    }));
    expect(parsed.doneText).toBe("done");
    expect(parsed.deltas).toEqual([{ type: "text", content: "done" }]);
  });

  it("maps function calls to tool deltas", () => {
    expect(codexTranscriptLineToDeltas(JSON.stringify({
      type: "response_item",
      payload: { type: "function_call", name: "exec_command", call_id: "call-1" },
    })).deltas).toEqual([{
      type: "tool_use",
      content: "Using exec_command",
      toolName: "exec_command",
      toolId: "call-1",
    }]);

    expect(codexTranscriptLineToDeltas(JSON.stringify({
      type: "response_item",
      payload: { type: "function_call_output", call_id: "call-1" },
    })).deltas).toEqual([{
      type: "tool_result",
      content: "Done",
      toolId: "call-1",
    }]);
  });

  it("uses last_token_usage for context deltas", () => {
    const parsed = codexTranscriptLineToDeltas(JSON.stringify({
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { input_tokens: 9_282_000 },
          last_token_usage: { input_tokens: 42_000 },
        },
      },
    }));
    expect(parsed.contextTokens).toBe(42_000);
    expect(parsed.deltas).toEqual([{ type: "context", content: "42000" }]);
  });
});
