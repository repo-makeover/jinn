/**
 * Jinn Talk — rehydration transforms (server snapshot → UI state).
 */
import { describe, it, expect } from "vitest"
import { messagesToEntries } from "../rehydrate"

describe("messagesToEntries", () => {
  it("maps user/assistant messages to finalized entries (markdown stripped)", () => {
    const session = {
      messages: [
        { id: "u1", role: "user", content: "hello there" },
        { id: "a1", role: "assistant", content: "## Hi\n**bold** reply" },
      ],
    }
    expect(messagesToEntries(session)).toEqual([
      { id: "u1", role: "user", text: "hello there", partial: false, full: "hello there" },
      { id: "a1", role: "assistant", text: "Hi\nbold reply", partial: false, full: "Hi\nbold reply" },
    ])
  })

  it("maps notification rows to system entries; drops empty bodies", () => {
    const session = {
      messages: [
        { id: "n1", role: "notification", content: "joined" },
        { id: "a1", role: "assistant", content: "   " },
        { id: "a2", role: "assistant", content: "kept" },
      ],
    }
    expect(messagesToEntries(session)).toEqual([
      { id: "n1", kind: "system", event: "info", label: "joined" },
      { id: "a2", role: "assistant", text: "kept", partial: false, full: "kept" },
    ])
  })

  it('maps 📩 Thread "label" reported back to system/reported', () => {
    const session = {
      messages: [
        {
          id: "n1",
          role: "notification",
          content: '📩 Thread "Pravko blog" reported back. Summary here.',
        },
      ],
    }
    expect(messagesToEntries(session)).toEqual([
      { id: "n1", kind: "system", event: "reported", label: "Pravko blog" },
    ])
  })

  it('maps ⚠️ Thread "X" hit an error to system/error', () => {
    const session = {
      messages: [{ id: "n2", role: "notification", content: '⚠️ Thread "X" hit an error' }],
    }
    expect(messagesToEntries(session)).toEqual([
      { id: "n2", kind: "system", event: "error", label: "X" },
    ])
  })

  it('maps 🔄 Employee "X" resumed to system/reported', () => {
    const session = {
      messages: [
        {
          id: "n3",
          role: "notification",
          content: '🔄 Employee "jinn-dev" has resumed after rate limit cleared.',
        },
      ],
    }
    expect(messagesToEntries(session)).toEqual([
      { id: "n3", kind: "system", event: "reported", label: "jinn-dev" },
    ])
  })

  it('maps 📩 Employee "X" replied (persisted format) to system/reported', () => {
    const content =
      '📩 Employee "content-lead" replied in child session abc123.\n\nReply preview:\nDone.'
    const session = {
      messages: [{ id: "n4", role: "notification", content }],
    }
    expect(messagesToEntries(session)).toEqual([
      { id: "n4", kind: "system", event: "reported", label: "content-lead" },
    ])
  })

  it("maps unparseable notification (no emoji, no quotes) to system/info with first 60 chars", () => {
    const content = "Some plain notification message that has no emoji or quotes here"
    const session = {
      messages: [{ id: "n5", role: "notification", content }],
    }
    expect(messagesToEntries(session)).toEqual([
      { id: "n5", kind: "system", event: "info", label: content.slice(0, 60) },
    ])
  })

  it("synthesizes id for notification without an id", () => {
    const session = {
      messages: [{ role: "notification", content: "ping" }],
    }
    const result = messagesToEntries(session)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ kind: "system", event: "info", label: "ping" })
    expect(typeof result[0].id).toBe("string")
  })

  it("falls back to .history and synthesizes ids", () => {
    const session = { history: [{ role: "user", text: "no id here" }] }
    expect(messagesToEntries(session)).toEqual([
      { id: "user-0", role: "user", text: "no id here", partial: false, full: "no id here" },
    ])
  })

  it("returns [] for missing/!array history", () => {
    expect(messagesToEntries(undefined)).toEqual([])
    expect(messagesToEntries({})).toEqual([])
    expect(messagesToEntries({ messages: "nope" })).toEqual([])
  })
})
