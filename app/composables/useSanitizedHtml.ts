import { computed, type ComputedRef, type Ref } from 'vue'
import sanitizeHtml from 'sanitize-html'

/**
 * Default policy used by `sanitizeUserHtml` / `useSanitizedHtml`.
 *
 * Mirrors `sanitize-html`'s built-in defaults but adds a small set of common
 * formatting tags (img, h1-h2, span, figure, code/pre) and the inline style
 * attribute on a few presentational tags so that pasted rich text from
 * Tiptap / marked-rendered Markdown survives. **It does not allow `<script>`,
 * event handlers, `javascript:` URLs, or `<iframe>` by default.**
 *
 * For preview surfaces that intentionally need iframes (e.g. embedded
 * newsletter previews) callers can pass `{ allowIframes: true }`.
 */
const BASE_ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  'h1',
  'h2',
  'img',
  'figure',
  'figcaption',
  'span',
  'u',
  's',
  'sub',
  'sup',
  'code',
  'pre',
]

const BASE_ALLOWED_ATTRS: sanitizeHtml.IOptions['allowedAttributes'] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  '*': ['class', 'id', 'style'],
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
}

export interface SanitizeOptions {
  /** Whitelist `<iframe>` (e.g. for video embeds). Default: false. */
  allowIframes?: boolean
  /** Override the entire sanitize-html config. Use sparingly. */
  raw?: sanitizeHtml.IOptions
}

export function sanitizeUserHtml(
  input: string | null | undefined,
  opts: SanitizeOptions = {}
): string {
  if (!input) return ''
  if (opts.raw) return sanitizeHtml(input, opts.raw)

  const config: sanitizeHtml.IOptions = {
    allowedTags: opts.allowIframes
      ? [...BASE_ALLOWED_TAGS, 'iframe']
      : BASE_ALLOWED_TAGS,
    allowedAttributes: opts.allowIframes
      ? {
          ...BASE_ALLOWED_ATTRS,
          iframe: [
            'src',
            'width',
            'height',
            'frameborder',
            'allowfullscreen',
            'allow',
            'loading',
            'title',
          ],
        }
      : BASE_ALLOWED_ATTRS,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
    allowProtocolRelative: true,
    transformTags: {
      // Force external links to open safely.
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer nofollow',
      }),
    },
  }

  return sanitizeHtml(input, config)
}

/**
 * Reactive wrapper. Returns a `ComputedRef<string>` that re-sanitizes whenever
 * the source ref / getter changes. Use as the binding for `v-html` to make
 * tenant-supplied or admin-supplied HTML safe to render.
 *
 * @example
 * const safeStory = useSanitizedHtml(() => storyContent.value)
 * // <div v-html="safeStory" />
 */
export function useSanitizedHtml(
  source: Ref<string | null | undefined> | (() => string | null | undefined),
  opts: SanitizeOptions = {}
): ComputedRef<string> {
  return computed(() => {
    const value = typeof source === 'function' ? source() : source.value
    return sanitizeUserHtml(value, opts)
  })
}

/**
 * Plain-text escaper for the `AlertDialog` / `ErrorState` / `EmptyState`
 * pattern that previously did `message.replace(/\n/g, '<br>')`. Escapes HTML
 * special characters first, then converts newlines to `<br>`. Safe to bind
 * via `v-html` because the input can no longer carry markup.
 */
export function escapeAndPreserveNewlines(input: string | null | undefined): string {
  if (!input) return ''
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')
}
