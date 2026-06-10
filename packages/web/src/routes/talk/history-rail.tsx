/**
 * Jinn Talk — conversation history rail (Mission Control).
 *
 * The live caption stays cinematic (latest exchange only); this collapsible
 * overlay is the memory — every exchange of the talk session, scrollable, with
 * tappable links. Newest at the bottom; opens scrolled to the end.
 */
import { useEffect, useRef } from "react"
import type { JSX } from "react"
import type { TranscriptEntry } from "./transcript"
import { Linkified } from "./linkify"

export interface HistoryRailProps {
  entries: TranscriptEntry[]
  open: boolean
  onClose: () => void
}

export function HistoryRail({ entries, open, onClose }: HistoryRailProps): JSX.Element | null {
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" })
  }, [open, entries.length])

  if (!open) return null
  return (
    <div className="history-rail" role="log" aria-label="Conversation history">
      <button type="button" className="history-rail__close" onClick={onClose} aria-label="Close history">
        ×
      </button>
      <div className="history-rail__scroll">
        {entries.map((e) => (
          <div key={e.id} className={`history-rail__row history-rail__row--${e.role}`}>
            <Linkified text={e.full ?? e.text} />
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
