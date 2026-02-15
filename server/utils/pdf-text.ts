/**
 * Extract text from PDF buffer (server-side).
 * Uses pdf-parse if available; otherwise returns empty string and caller should handle.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // @ts-ignore - pdf-parse has no declaration file
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return (data?.text || '').trim()
  } catch (e) {
    console.error('[pdf-text] Extraction failed:', e)
    return ''
  }
}
