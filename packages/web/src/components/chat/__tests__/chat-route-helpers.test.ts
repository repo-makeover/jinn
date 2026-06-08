import { describe, it, expect } from 'vitest'
import { resolveDeepLink, mergeSidebarEmployees } from '../chat-route-helpers'

describe('resolveDeepLink', () => {
  const link = (qs: string) => resolveDeepLink(new URLSearchParams(qs))

  it('maps ?session=<id> to a session deep-link', () => {
    expect(link('session=abc')).toEqual({ kind: 'session', id: 'abc' })
  })

  it('maps ?employee=<name> to an employee deep-link', () => {
    expect(link('employee=jinn-dev')).toEqual({ kind: 'employee', name: 'jinn-dev' })
  })

  it('gives session precedence when both params are present', () => {
    expect(link('session=abc&employee=jinn-dev')).toEqual({ kind: 'session', id: 'abc' })
  })

  it('returns null when neither param is present', () => {
    expect(link('foo=bar')).toBeNull()
    expect(link('')).toBeNull()
  })

  it('ignores empty values', () => {
    expect(link('session=')).toBeNull()
    expect(link('employee=')).toBeNull()
  })

  it('ignores whitespace-only values and trims real ones', () => {
    expect(link('session=%20%20')).toBeNull()
    expect(link('employee=%20pravko-lead%20')).toEqual({ kind: 'employee', name: 'pravko-lead' })
  })

  it('falls back to employee when session is empty but employee is set', () => {
    expect(link('session=&employee=homy-lead')).toEqual({ kind: 'employee', name: 'homy-lead' })
  })
})

describe('mergeSidebarEmployees', () => {
  it('unions sessionful (first) with roster-only (after), de-duped', () => {
    expect(mergeSidebarEmployees(['a', 'b'], ['b', 'c', 'a', 'd'])).toEqual(['a', 'b', 'c', 'd'])
  })

  it('preserves session order first, then roster order for the rest', () => {
    expect(mergeSidebarEmployees(['b', 'a'], ['a', 'c', 'b'])).toEqual(['b', 'a', 'c'])
  })

  it('returns roster (deduped) when there are no sessionful employees', () => {
    expect(mergeSidebarEmployees([], ['x', 'y', 'x', 'z'])).toEqual(['x', 'y', 'z'])
  })

  it('returns sessionful (deduped) when roster is empty', () => {
    expect(mergeSidebarEmployees(['x', 'x', 'y'], [])).toEqual(['x', 'y'])
  })

  it('returns [] when both are empty', () => {
    expect(mergeSidebarEmployees([], [])).toEqual([])
  })

  it('drops falsy entries', () => {
    expect(mergeSidebarEmployees(['', 'a'], ['', 'b'])).toEqual(['a', 'b'])
  })

  it('does not mutate its inputs', () => {
    const sessionful = ['a']
    const roster = ['b']
    mergeSidebarEmployees(sessionful, roster)
    expect(sessionful).toEqual(['a'])
    expect(roster).toEqual(['b'])
  })
})
