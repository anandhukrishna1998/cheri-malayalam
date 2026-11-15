import type { Item } from './content'

/**
 * Manglish has no single spelling, so we compare a "loose" form:
 * lowercase, letters only, aspirated consonants simplified (th→t, kh→k…),
 * nd→nt, zh→z, repeated letters collapsed (aa→a, kk→k).
 */
export function loose(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
    .replace(/([bcdgkpst])h/g, '$1')
    .replace(/nd/g, 'nt')
    .replace(/w/g, 'v')
    .replace(/(.)\1+/g, '$1')
}

export function isCorrectManglish(input: string, item: Item): boolean {
  const target = loose(input)
  if (!target) return false
  return [item.manglish, ...(item.accept ?? [])].some(v => loose(v) === target)
}

export function isExactish(input: string, item: Item): boolean {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  return clean(input) === clean(item.manglish)
}
