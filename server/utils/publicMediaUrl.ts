/**
 * Normalize DB-stored upload paths for the browser (img src, etc.).
 * Handles "/uploads/...", "uploads/...", and legacy bare filenames under avatars.
 */
export function resolveStoredUploadUrl(stored: string | null | undefined): string | null {
  if (stored == null) return null
  const t = String(stored).trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('/')) return t
  if (t.startsWith('uploads/')) return `/${t}`
  // Relative paths saved without leading slash (e.g. logos/foo.png)
  if (
    /^(logos|avatars|favicons|brokerage|documents|properties|blog|testimonials|newsletter-attachments|listing-templates|partnerships)\//i.test(
      t,
    )
  ) {
    return `/${t}`
  }
  return `/uploads/avatars/${t}`
}
