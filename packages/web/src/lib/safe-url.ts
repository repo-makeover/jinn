/**
 * Returns the URL only if it uses a safe scheme (http/https/mailto), otherwise
 * null. Use before assigning any attacker-influenced value (media URLs, agent
 * output, archived content) to an <a href> / <img src> so a `javascript:` or
 * `data:text/html` URL cannot execute script in the dashboard origin — which,
 * given the local gateway, would be a privilege-escalation vector.
 */
export function safeHttpUrl(url: string | undefined | null): string | null {
  if (typeof url !== "string") return null
  const trimmed = url.trim()
  return /^(https?:\/\/|mailto:)/i.test(trimmed) ? trimmed : null
}
