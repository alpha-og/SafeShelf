// Thin wrapper around crypto.randomUUID() so call sites don't reach for the
// global directly, and so a polyfill (if ever needed) only has one place to land.
export function generateId(): string {
  return crypto.randomUUID()
}
