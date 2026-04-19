/**
 * Thin wrapper around the `qrcode` package for client-side generation.
 * Returns a data URL so it can be used directly in <img :src="..."> or
 * downloaded with a synthetic <a download>.
 */
import QRCode from 'qrcode'

export interface QrOptions {
  size?: number
  margin?: number
  /** Foreground / background hex colors. */
  color?: { dark?: string; light?: string }
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

export async function generateQrDataUrl(text: string, opts: QrOptions = {}): Promise<string> {
  return QRCode.toDataURL(text, {
    width: opts.size ?? 512,
    margin: opts.margin ?? 2,
    errorCorrectionLevel: opts.errorCorrectionLevel ?? 'M',
    color: {
      dark: opts.color?.dark ?? '#0F172A',
      light: opts.color?.light ?? '#FFFFFF',
    },
  })
}

/** Trigger a browser download of a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  if (typeof document === 'undefined') return
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
