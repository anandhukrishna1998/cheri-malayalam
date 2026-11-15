/** Turns Manglish into an id: "Ithu enthaanu?" → "ithu-enthaanu". */
export function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Rewrites Manglish the way a French reader would pronounce it:
 * u → ou, e → é, ch → tch, sh → ch, nj → gn, j → dj, ee → ii,
 * and doubles n/m before a consonant so they are never read as nasal.
 */
export function autoHint(manglish: string): string {
  return manglish
    .split(/\s+/)
    .map(word => {
      const w = word.replace(/[?!.,]/g, '')
      if (!w) return ''
      // Words that are really French/English (France, Marie, bus…) stay as they are.
      if (/^[A-Z]/.test(w) && /(ce|ie|us)$/.test(w) && w.length > 2 && !/aa|ee|oo/.test(w)) return w
      let s = w.toLowerCase()
      // Placeholders (uppercase letters never appear after toLowerCase) protect digraphs.
      s = s.replace(/oo/g, 'O').replace(/ee/g, 'E')
        .replace(/zh/g, 'Z').replace(/sh/g, 'S').replace(/ch/g, 'C')
        .replace(/nj/g, 'gn').replace(/j/g, 'dj')
        .replace(/([tdkgbp])h/g, '$1')
        .replace(/ai/g, 'aï')
        .replace(/u/g, 'ou').replace(/e/g, 'é')
        .replace(/O/g, 'ou').replace(/E/g, 'ii')
        .replace(/Z/g, 'zh').replace(/S/g, 'ch').replace(/C/g, 'tch')
        .replace(/([aeiouéïy])([nm])(?=[^aeiouéïynm]|$)/g, '$1$2$2')
      return s
    })
    .filter(Boolean)
    .join(' ')
}
