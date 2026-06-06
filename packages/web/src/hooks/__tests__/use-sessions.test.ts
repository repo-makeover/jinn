import { describe, it, expect } from 'vitest'
import { mergeSessionsResponse } from '../use-sessions'
import type { SessionsResponse } from '@/lib/api'

const session = (id: string, extra: Record<string, unknown> = {}) => ({ id, ...extra })

const resp = (
  sessions: Record<string, unknown>[],
  counts: Record<string, number> = {},
  perGroup = 8,
): SessionsResponse => ({ sessions, counts, perGroup })

describe('mergeSessionsResponse', () => {
  it('returns fresh as-is when there is no prior cache', () => {
    const fresh = resp([session('a'), session('b')])
    expect(mergeSessionsResponse(undefined, fresh)).toBe(fresh)
  })

  it('returns fresh as-is when prior cache is empty', () => {
    const fresh = resp([session('a')])
    expect(mergeSessionsResponse(resp([]), fresh)).toBe(fresh)
  })

  it('preserves previously-loaded extras not present in the fresh top-N', () => {
    // Simulates "load more" having paged in older sessions, then a refetch that
    // only returns the bounded top-N.
    const old = resp([session('a'), session('b'), session('c'), session('d')])
    const fresh = resp([session('a'), session('b')])
    const merged = mergeSessionsResponse(old, fresh)
    expect(merged.sessions.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('lets fresh rows win for ids present in both (newest status/activity)', () => {
    const old = resp([session('a', { status: 'idle' }), session('z', { status: 'idle' })])
    const fresh = resp([session('a', { status: 'running' })])
    const merged = mergeSessionsResponse(old, fresh)
    const a = merged.sessions.find((s) => s.id === 'a')
    expect(a?.status).toBe('running')
    // The extra-only session is preserved.
    expect(merged.sessions.find((s) => s.id === 'z')).toBeTruthy()
  })

  it('carries counts and perGroup from the fresh payload', () => {
    const old = resp([session('a')], { __direct__: 50 }, 8)
    const fresh = resp([session('a')], { __direct__: 51 }, 8)
    const merged = mergeSessionsResponse(old, fresh)
    expect(merged.counts.__direct__).toBe(51)
    expect(merged.perGroup).toBe(8)
  })

  it('does not duplicate ids that appear in both payloads', () => {
    const old = resp([session('a'), session('b')])
    const fresh = resp([session('a'), session('b')])
    const merged = mergeSessionsResponse(old, fresh)
    expect(merged.sessions.map((s) => s.id)).toEqual(['a', 'b'])
  })
})
