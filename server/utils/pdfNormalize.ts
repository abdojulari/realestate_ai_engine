import { PDFDocument } from 'pdf-lib'

/** Minimum plausible PDF size (header + one page). */
const MIN_PDF_BYTES = 64

const saveOpts = {
  useObjectStreams: false as const,
  addDefaultPage: false as const,
}

/**
 * Verdocs' parser is strict. We still need a rewritten file for some uploads, but we must NOT
 * default to `copyPages` into a new document: that often drops vectors/images/forms while staying
 * "valid", which yields a blank signer view with fields still placed (Verdocs accepts the bytes).
 *
 * Prefer **load + save on the same document** (structure cleanup, object streams off). Only if
 * that fails, fall back to copyPages (logged).
 */
export async function normalizePdfBufferForVerdocs(buf: Buffer): Promise<Buffer> {
  if (!buf || buf.length < MIN_PDF_BYTES) {
    throw new Error('PDF file is empty or too small')
  }
  const head = buf.subarray(0, Math.min(1024, buf.length)).toString('latin1')
  if (!head.includes('%PDF')) {
    throw new Error('Missing PDF header (%PDF)')
  }

  const src = await PDFDocument.load(buf, {
    ignoreEncryption: true,
    updateMetadata: false,
    capNumbers: true,
  })

  const indices = src.getPageIndices()
  if (indices.length === 0) {
    throw new Error('PDF has no pages')
  }

  try {
    const bytes = await src.save(saveOpts)
    return Buffer.from(bytes)
  } catch (first) {
    console.warn(
      '[Verdocs] PDF save-only rewrite failed; falling back to page copy (content may be lost on complex PDFs):',
      first instanceof Error ? first.message : first
    )
  }

  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, indices)
  for (const page of copied) {
    out.addPage(page)
  }
  const bytes = await out.save(saveOpts)
  return Buffer.from(bytes)
}
