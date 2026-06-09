/**
 * Jinn Talk — neural-vs-fallback voice indicator.
 *
 * A tiny dot + label showing which voice produced the last spoken turn:
 *   • "Neural" — the gateway streamed Kokoro audio and it played.
 *   • "Fallback" — the browser Web-Speech synth (Kokoro absent/unavailable).
 * Driven by useTalk's `voiceMode` (set per turn from whether talk:audio arrived).
 * Renders nothing until the first turn has been spoken, so it stays invisible
 * on the calm idle surface.
 */
import type { VoiceMode } from "./use-talk"

export function TalkVoiceIndicator({ voiceMode, muted }: { voiceMode: VoiceMode; muted?: boolean }) {
  // Muted and Fallback are states the operator should NOTICE (no voice / degraded
  // voice), so they render as a small bordered chip. Neural is the expected,
  // calm state — kept as a quiet dot + label so it doesn't shout on the surface.

  // Silent/text mode takes precedence — there is no voice to label.
  if (muted) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-[var(--separator)] bg-[var(--fill-secondary)] px-1.5 py-0.5 text-[length:var(--text-caption2)] font-medium text-[var(--text-secondary)]"
        title="Silent mode — replies are read, not spoken"
      >
        <span aria-hidden className="size-1.5 rounded-full" style={{ background: "var(--text-tertiary)" }} />
        Muted
      </span>
    )
  }
  if (!voiceMode) return null
  const neural = voiceMode === "neural"
  if (neural) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[length:var(--text-caption2)] text-[var(--text-quaternary)]"
        title="Spoken with the neural Kokoro voice"
      >
        <span aria-hidden className="size-1.5 rounded-full" style={{ background: "var(--accent)" }} />
        Neural
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-[var(--separator)] bg-[var(--material-regular)] px-1.5 py-0.5 text-[length:var(--text-caption2)] font-medium text-[var(--system-orange)]"
      title="Spoken with the browser fallback voice (neural voice unavailable)"
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: "var(--system-orange)" }} />
      Fallback
    </span>
  )
}
