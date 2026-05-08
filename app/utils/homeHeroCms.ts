/**
 * Map CMS ContentBlock keys (home section) into hero props for home templates.
 * Use the first line of `hero-title`, optional second line after newline or `|`.
 */
export function parseHeroTitleLines(raw: string | undefined): { primary: string; accent: string } {
  const parts = (raw || '')
    .split(/\r?\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    primary: parts[0] || '',
    accent: parts[1] || '',
  }
}

export function extractHomeHeroFromBlocks(
  items: Array<{ key?: string; content?: string }>,
): {
  heroImageUrl: string
  heroTitlePrimary: string
  heroTitleAccent: string
  heroSubtitle: string
} {
  const find = (k: string) => items.find((i) => i.key === k)?.content?.trim() || ''
  const { primary, accent } = parseHeroTitleLines(find('hero-title'))
  return {
    heroImageUrl: find('hero'),
    heroTitlePrimary: primary,
    heroTitleAccent: accent,
    heroSubtitle: find('hero-subtitle'),
  }
}
