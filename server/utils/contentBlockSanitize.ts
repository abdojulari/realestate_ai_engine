/**
 * HTML stored on ContentBlock rows — sanitize on write using the same
 * conservative policy as Resources / TipTap (allowlist tags + attrs).
 */
import { sanitizeHtml } from './resourceCms'

export function contentBlockUsesRichHtml(input: { type?: string; key?: string }): boolean {
  const t = (input.type || '').toLowerCase()
  if (t === 'html') return true
  const k = input.key || ''
  if (k === 'about.story.content') return true
  return false
}

export function sanitizeContentBlockHtml(html: string): string {
  return sanitizeHtml(html || '')
}
