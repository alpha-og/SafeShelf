/**
 * Derives initials from a profile name: first letter of the first word, plus
 * first letter of the second word if one exists (e.g. "John" -> "J",
 * "John Doe" -> "JD", "Mary Jane Smith" -> "MJ" — only the first two words count).
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0][0].toUpperCase()
  if (words.length === 1) return first
  return first + words[1][0].toUpperCase()
}
