import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getUploadRoot } from '../../../utils/uploadStorage'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'

/**
 * POST /api/admin/posted-rates/upload-bank-logo
 * ─────────────────────────────────────────────
 * Stores a bank logo file under public/uploads/bank-logos/ and returns the
 * public URL. The URL is meant to be saved into PostedRate.bankLogoUrl when
 * the admin submits the rate form (this endpoint does NOT mutate any DB row
 * itself — same flow as the tenant-settings logo uploader, just simpler
 * because there's no per-tenant "current value" to overwrite up-front).
 *
 * Form fields:
 *   - logo: file (required) — PNG / JPG / JPEG only per the request
 *   - bank: optional text — used purely to make the saved filename
 *           recognisable on disk, e.g. "rbc_1730000000.png"
 *
 * Cap: 5 MB. Bank logos are tiny — anything bigger is almost certainly a
 * mistake (someone uploading a billboard).
 */

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg'])
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg'])

function fail(statusCode: number, code: string, message: string) {
  return createError({
    statusCode,
    statusMessage: message,
    data: { code, message, maxBytes: MAX_BYTES },
  })
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  // adminId is computed but not stored on the file — it's used to scope
  // the on-disk filename so two tenants uploading "rbc.png" don't collide.
  const adminId = getAdminIdForCreate(user)

  let form
  try {
    form = await readMultipartFormData(event)
  } catch (err: any) {
    console.error('[bank-logo upload] multipart parse failed:', err?.message || err)
    throw fail(
      413,
      'PAYLOAD_TOO_LARGE',
      `File too large. Maximum size is ${Math.round(MAX_BYTES / (1024 * 1024))} MB.`,
    )
  }

  const filePart = form?.find(f => f.name === 'logo' && !!f.filename)
  if (!filePart || !filePart.data || !filePart.filename) {
    throw fail(400, 'NO_FILE', 'No logo file uploaded. Send a "logo" field.')
  }

  if (filePart.data.length > MAX_BYTES) {
    throw fail(
      413,
      'PAYLOAD_TOO_LARGE',
      `Logo is ${(filePart.data.length / (1024 * 1024)).toFixed(1)} MB. Maximum is ${Math.round(MAX_BYTES / (1024 * 1024))} MB.`,
    )
  }

  const ext = path.extname(filePart.filename).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    throw fail(415, 'INVALID_TYPE', `Unsupported file type "${ext}". Use PNG, JPG, or JPEG.`)
  }
  if (filePart.type && !ALLOWED_MIME.has(filePart.type.toLowerCase())) {
    throw fail(415, 'INVALID_TYPE', `Unsupported MIME type "${filePart.type}". Use PNG, JPG, or JPEG.`)
  }

  const bankPart = form?.find(f => f.name === 'bank' && !f.filename)
  const bankSlug = (bankPart?.data ? Buffer.from(bankPart.data as Uint8Array).toString('utf8') : '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'bank'

  try {
    const subdir = 'bank-logos'
    const uploadDir = path.join(getUploadRoot(), subdir)
    await fs.mkdir(uploadDir, { recursive: true })

    // adminId + timestamp keeps filenames unique across tenants while still
    // being human-readable in the upload directory.
    const filename = `${bankSlug}_${adminId}_${Date.now()}${ext}`
    const filePath = path.join(uploadDir, filename)
    await fs.writeFile(filePath, filePart.data as Buffer)

    const publicUrl = `/uploads/${subdir}/${filename}`
    return {
      success: true,
      url: publicUrl,
      filename,
      bytes: filePart.data.length,
    }
  } catch (err: any) {
    console.error('[bank-logo upload] write failed:', err)
    throw fail(500, 'WRITE_FAILED', 'Could not save the logo. Please try again.')
  }
})
