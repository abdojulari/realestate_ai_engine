/**
 * OCR Receipt Parsing Service
 * Extracts structured data from receipt text using pattern matching.
 * Works with Tesseract.js OCR output from the client.
 */

export interface ReceiptData {
  vendor: string
  receiptNumber: string
  date: string
  subtotal: number
  gst: number
  hst: number
  pst: number
  taxTotal: number
  total: number
  items: string[]
  confidence: number
}

// Common receipt patterns
const PATTERNS = {
  total: /(?:total|amount\s*due|balance\s*due|grand\s*total)\s*[\$:]?\s*\$?([\d,]+\.?\d{0,2})/i,
  subtotal: /(?:subtotal|sub\s*total|sub-total|before\s*tax)\s*[\$:]?\s*\$?([\d,]+\.?\d{0,2})/i,
  gst: /(?:gst|g\.s\.t\.?)\s*[\$:#]?\s*\$?([\d,]+\.?\d{0,2})/i,
  hst: /(?:hst|h\.s\.t\.?)\s*[\$:#]?\s*\$?([\d,]+\.?\d{0,2})/i,
  pst: /(?:pst|p\.s\.t\.?|qst|q\.s\.t\.?)\s*[\$:#]?\s*\$?([\d,]+\.?\d{0,2})/i,
  tax: /(?:tax|taxes)\s*[\$:]?\s*\$?([\d,]+\.?\d{0,2})/i,
  date: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
  dateAlt: /(\w{3,9}\s+\d{1,2},?\s+\d{4})/i,
  receiptNumber: /(?:receipt|invoice|order|trans(?:action)?|ref)\s*[#:]\s*(\S+)/i,
}

function parseAmount(str: string): number {
  if (!str) return 0
  const cleaned = str.replace(/,/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : Math.round(num * 100) / 100
}

function extractVendor(lines: string[]): string {
  // First non-empty line that looks like a business name (not a number, not a date)
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim()
    if (
      trimmed.length > 2 &&
      !/^\d+$/.test(trimmed) &&
      !/^\d{1,2}[\/\-]/.test(trimmed) &&
      !/^(receipt|invoice|order|date|time|tel|phone|fax)/i.test(trimmed) &&
      !/^\$/.test(trimmed)
    ) {
      return trimmed
    }
  }
  return 'Unknown Vendor'
}

function extractDate(text: string): string {
  const match = text.match(PATTERNS.date) || text.match(PATTERNS.dateAlt)
  if (match) {
    try {
      const parsed = new Date(match[1])
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    } catch { /* fall through */ }
    return match[1]
  }
  return new Date().toISOString().split('T')[0]
}

export function parseReceiptText(ocrText: string): ReceiptData {
  const lines = ocrText.split('\n').filter(l => l.trim())
  let confidence = 0
  let maxConfidence = 0

  const vendor = extractVendor(lines)
  maxConfidence++
  if (vendor !== 'Unknown Vendor') confidence++

  const receiptMatch = ocrText.match(PATTERNS.receiptNumber)
  const receiptNumber = receiptMatch ? receiptMatch[1] : ''
  maxConfidence++
  if (receiptNumber) confidence++

  const date = extractDate(ocrText)
  maxConfidence++
  confidence++ // date always extracted (fallback to today)

  const totalMatch = ocrText.match(PATTERNS.total)
  const total = totalMatch ? parseAmount(totalMatch[1]) : 0
  maxConfidence++
  if (total > 0) confidence++

  const subtotalMatch = ocrText.match(PATTERNS.subtotal)
  let subtotal = subtotalMatch ? parseAmount(subtotalMatch[1]) : 0
  maxConfidence++
  if (subtotal > 0) confidence++

  const gstMatch = ocrText.match(PATTERNS.gst)
  const gst = gstMatch ? parseAmount(gstMatch[1]) : 0

  const hstMatch = ocrText.match(PATTERNS.hst)
  const hst = hstMatch ? parseAmount(hstMatch[1]) : 0

  const pstMatch = ocrText.match(PATTERNS.pst)
  const pst = pstMatch ? parseAmount(pstMatch[1]) : 0

  const taxMatch = ocrText.match(PATTERNS.tax)
  let taxTotal = gst + hst + pst
  if (taxTotal === 0 && taxMatch) {
    taxTotal = parseAmount(taxMatch[1])
  }
  maxConfidence++
  if (taxTotal > 0) confidence++

  // Infer subtotal if missing
  if (subtotal === 0 && total > 0 && taxTotal > 0) {
    subtotal = Math.round((total - taxTotal) * 100) / 100
  }

  return {
    vendor,
    receiptNumber,
    date,
    subtotal,
    gst,
    hst,
    pst,
    taxTotal,
    total: total || (subtotal + taxTotal),
    items: [],
    confidence: maxConfidence > 0 ? Math.round((confidence / maxConfidence) * 100) : 0,
  }
}
