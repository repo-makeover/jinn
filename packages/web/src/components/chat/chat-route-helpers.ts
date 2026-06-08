/**
 * Pure helpers for the chat route (packages/web/src/routes/chat/page.tsx).
 *
 * Extracted as side-effect-free functions so they can be unit-tested without a
 * DOM/render harness — the high-value, low-flakiness part of the deep-link +
 * contactable-roster features (#19b / #19c).
 */

export type DeepLink =
  | { kind: 'session'; id: string }
  | { kind: 'employee'; name: string }
  | null

/**
 * Map the chat route's URL search params to a deep-link action.
 *
 * Precedence: `?session=` wins over `?employee=` when both are present (a
 * concrete session id is the more specific intent). Empty / whitespace-only
 * values are ignored. Returns `null` when neither yields a usable value.
 */
export function resolveDeepLink(sp: URLSearchParams): DeepLink {
  const session = sp.get('session')?.trim()
  if (session) return { kind: 'session', id: session }
  const employee = sp.get('employee')?.trim()
  if (employee) return { kind: 'employee', name: employee }
  return null
}

/**
 * Merge the employees that already have sessions with the full org roster so
 * session-less employees are still listed (and contactable) in the sidebar.
 *
 * Result is a de-duped union: employees with sessions first (in their incoming
 * order), then roster-only employees (in roster order). Falsy entries are
 * dropped. The input arrays are never mutated.
 */
export function mergeSidebarEmployees(
  sessionEmployeeNames: string[],
  rosterNames: string[],
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of sessionEmployeeNames) {
    if (name && !seen.has(name)) {
      seen.add(name)
      result.push(name)
    }
  }
  for (const name of rosterNames) {
    if (name && !seen.has(name)) {
      seen.add(name)
      result.push(name)
    }
  }
  return result
}
