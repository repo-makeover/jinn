import type { UpstreamActivityInfo } from "./sse-pty-proxy.js";

export const BACKGROUND_CLEAR_QUIET_MS = 10_000;

/** Tracks post-settle upstream activity reported by a PTY's SSE proxy. */
export class ClaudeBackgroundActivity {
  private states = new Map<string, { info: UpstreamActivityInfo; clearTimer?: NodeJS.Timeout; emitted: boolean }>();
  private cb?: (jinnSessionId: string, info: UpstreamActivityInfo | null) => void;
  quietMs = BACKGROUND_CLEAR_QUIET_MS;

  constructor(private isTurnActive: (jinnSessionId: string) => boolean) {}

  onBackgroundActivity(cb: (jinnSessionId: string, info: UpstreamActivityInfo | null) => void): void {
    this.cb = cb;
  }

  /** Per-PTY SSE proxy reported an in-flight change. Always record it (counts
   *  must stay truthful across the run boundary); emission is gated downstream. */
  handleUpstreamActivity(jinnSessionId: string, info: UpstreamActivityInfo): void {
    let st = this.states.get(jinnSessionId);
    if (!st) {
      st = { info, emitted: false };
      this.states.set(jinnSessionId, st);
    } else {
      st.info = info;
    }
    this.maybeEmit(jinnSessionId);
  }

  /** Emit the session's background state if it's post-settle and changed:
   *  active streams emit immediately (cancelling any pending clear); zero
   *  streams arm a quiet-window timer that emits `null` once, only if activity
   *  was previously reported. Suppressed entirely while a run() is in flight. */
  maybeEmit(jinnSessionId: string): void {
    const st = this.states.get(jinnSessionId);
    if (!st) return;
    if (this.isTurnActive(jinnSessionId)) return;
    if (st.info.activeStreams > 0) {
      if (st.clearTimer) { clearTimeout(st.clearTimer); st.clearTimer = undefined; }
      st.emitted = true;
      this.cb?.(jinnSessionId, { ...st.info });
      return;
    }
    if (!st.emitted) {
      // Reached 0 without ever being reported post-settle — nothing to clear.
      this.states.delete(jinnSessionId);
      return;
    }
    if (st.clearTimer) return; // quiet window already armed
    st.clearTimer = setTimeout(() => {
      const cur = this.states.get(jinnSessionId);
      if (cur !== st) return; // state was recreated/cleared since arming
      if (cur.info.activeStreams > 0) { cur.clearTimer = undefined; return; }
      this.states.delete(jinnSessionId);
      this.cb?.(jinnSessionId, null);
    }, this.quietMs);
    st.clearTimer.unref?.();
  }

  /** A new run() is taking the session: retract any reported background state
   *  (the session is about to be "running") but KEEP the live counts — the proxy
   *  persists across turns, and run()'s finally re-checks them post-settle. */
  suppress(jinnSessionId: string): void {
    const st = this.states.get(jinnSessionId);
    if (!st) return;
    if (st.clearTimer) { clearTimeout(st.clearTimer); st.clearTimer = undefined; }
    const wasEmitted = st.emitted;
    st.emitted = false;
    if (wasEmitted) this.cb?.(jinnSessionId, null);
  }

  /** Drop all background state for a session (PTY released / killed), emitting
   *  the cleared notification if activity had been reported. */
  clear(jinnSessionId: string): void {
    const st = this.states.get(jinnSessionId);
    if (!st) return;
    if (st.clearTimer) clearTimeout(st.clearTimer);
    this.states.delete(jinnSessionId);
    if (st.emitted) this.cb?.(jinnSessionId, null);
  }

  hasActive(jinnSessionId: string): boolean {
    return (this.states.get(jinnSessionId)?.info.activeStreams ?? 0) > 0;
  }
}
