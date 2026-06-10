import { describe, it, expect } from "vitest"
import { splitLinks } from "../linkify"

describe("splitLinks", () => {
  it("splits bare URLs out of prose", () => {
    expect(splitLinks("see https://example.com/x?a=1 for more")).toEqual([
      { kind: "text", text: "see " },
      { kind: "link", url: "https://example.com/x?a=1", text: "example.com/x?a=1" },
      { kind: "text", text: " for more" },
    ])
  })
  it("passes through plain text and trims trailing punctuation off the URL", () => {
    expect(splitLinks("no links here")).toEqual([{ kind: "text", text: "no links here" }])
    const segs = splitLinks("go to https://a.bc/d.")
    expect(segs[1]).toEqual({ kind: "link", url: "https://a.bc/d", text: "a.bc/d" })
    expect(segs[2]).toEqual({ kind: "text", text: "." })
  })
})
