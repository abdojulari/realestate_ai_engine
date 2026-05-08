/** Prefer CMS string when non-empty after trim; otherwise `fallback`. */
export function cmsOr(value: string | undefined | null, fallback: string): string {
  const t = (value ?? '').trim()
  return t || fallback
}
