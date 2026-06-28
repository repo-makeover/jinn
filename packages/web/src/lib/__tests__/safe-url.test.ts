import { describe, it, expect } from 'vitest'
import { safeHttpUrl } from '../safe-url'

describe('safeHttpUrl (S12 XSS guard)', () => {
  it('allows relative paths, http/https/mailto, and blob URLs', () => {
    // The app serves media via relative paths — these must remain clickable.
    expect(safeHttpUrl('/api/files/a')).toBe('/api/files/a')
    expect(safeHttpUrl('https://example.com/a.pdf')).toBe('https://example.com/a.pdf')
    expect(safeHttpUrl('http://127.0.0.1:7777/file')).toBe('http://127.0.0.1:7777/file')
    expect(safeHttpUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(safeHttpUrl('blob:https://x/y')).toBe('blob:https://x/y')
    expect(safeHttpUrl('  https://example.com  ')).toBe('https://example.com')
  })

  it('rejects javascript:, data:, vbscript:, file: (script-capable schemes)', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('JavaScript:fetch("/api")')).toBeNull()
    expect(safeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(safeHttpUrl('vbscript:msgbox(1)')).toBeNull()
    expect(safeHttpUrl('file:///etc/passwd')).toBeNull()
    expect(safeHttpUrl('  javascript:alert(1)')).toBeNull()
    // Whitespace/control-char-in-scheme bypass attempts.
    expect(safeHttpUrl('java\tscript:alert(1)')).toBeNull()
    expect(safeHttpUrl('java\nscript:alert(1)')).toBeNull()
    expect(safeHttpUrl(undefined)).toBeNull()
    expect(safeHttpUrl(null)).toBeNull()
  })
})
