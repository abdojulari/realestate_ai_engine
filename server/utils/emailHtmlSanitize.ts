/**
 * HTML sanitization for outgoing email bodies.
 *
 * Policy is intentionally more permissive than our on-site sanitizer
 * (`resourceCms.sanitizeHtml`) because legitimate newsletter HTML needs
 * tables, inline styles, images, and anchors — that's how every major email
 * client renders layout. We still drop script/iframe/object/embed/form,
 * `on*=` handlers, and `javascript:` URLs.
 *
 * Applied on the SEND path (not on save) so the original draft stays
 * editable; the sanitized version is what hits the recipient inbox.
 */

import sanitizeHtml from 'sanitize-html'

const EMAIL_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'a',
    'abbr',
    'address',
    'article',
    'b',
    'blockquote',
    'br',
    'caption',
    'center',
    'cite',
    'code',
    'col',
    'colgroup',
    'div',
    'em',
    'figcaption',
    'figure',
    'font',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hr',
    'i',
    'img',
    'label',
    'li',
    'main',
    'mark',
    'nav',
    'ol',
    'p',
    'pre',
    'q',
    's',
    'section',
    'small',
    'span',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title', 'style'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'style', 'border'],
    table: ['width', 'height', 'cellpadding', 'cellspacing', 'border', 'align', 'bgcolor', 'style', 'role'],
    td: ['width', 'height', 'colspan', 'rowspan', 'align', 'valign', 'bgcolor', 'style'],
    th: ['width', 'height', 'colspan', 'rowspan', 'align', 'valign', 'bgcolor', 'style', 'scope'],
    tr: ['align', 'valign', 'bgcolor', 'style'],
    font: ['color', 'size', 'face'],
    '*': ['class', 'style', 'id', 'dir', 'lang'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data', 'cid'],
  },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  parseStyleAttributes: false,
}

export function sanitizeEmailHtml(html: string): string {
  if (!html) return ''
  return sanitizeHtml(html, EMAIL_SANITIZE_OPTIONS)
}
