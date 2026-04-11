import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { promises as fs } from 'fs'
import path from 'path'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * POST /api/admin/tenant-settings/upload-logo
 *
 * Upload an image from the admin UI only (multipart). Saves under public/uploads and updates TenantSettings.
 * Form fields:
 *   - logo: file (required)
 *   - asset: optional text "logo" | "favicon" | "brokerage" (default logo)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const targetAdminId = getAdminIdForCreate(user)

  // ── Read multipart form data ──────────────────────────────
  const form = await readMultipartFormData(event)
  const filePart = form?.find((f: any) => f.name === 'logo')

  if (!filePart || !filePart.data || !filePart.filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No logo file uploaded. Please send a "logo" field.',
    })
  }

  const assetField = form?.find((f: any) => f.name === 'asset' && !f.filename)
  let asset = 'logo'
  if (assetField?.data) {
    const v = Buffer.from(assetField.data as Uint8Array).toString('utf8').trim().toLowerCase()
    if (v === 'favicon' || v === 'brokerage') asset = v
  }

  const subdir = asset === 'favicon' ? 'favicons' : asset === 'brokerage' ? 'brokerage' : 'logos'

  // ── Validate file type ────────────────────────────────────
  const extension = path.extname(filePart.filename).toLowerCase()
  const imageExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  const faviconExt = [...imageExt, '.ico']
  const allowed = asset === 'favicon' ? faviconExt : imageExt
  if (!allowed.includes(extension)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid file type: ${extension}. Allowed: ${allowed.join(', ')}`,
    })
  }

  try {
    // ── Ensure upload directory exists ─────────────────────────
    const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', subdir)
    await fs.mkdir(uploadDir, { recursive: true })

    // ── Save file to disk ─────────────────────────────────────
    const cleanName = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const nameWithoutExt = path.basename(cleanName, extension)
    const filename = `${nameWithoutExt}_${Date.now()}${extension}`
    const filePath = path.join(uploadDir, filename)

    await fs.writeFile(filePath, filePart.data as Buffer)

    const publicPath = `/uploads/${subdir}/${filename}`

    const updatePayload: Record<string, string> = {}
    if (asset === 'favicon') updatePayload.faviconUrl = publicPath
    else if (asset === 'brokerage') updatePayload.brokerageLogoUrl = publicPath
    else updatePayload.logoUrl = publicPath

    // ── Upsert TenantSettings ─────────────────────────────────
    const settings = await prisma.tenantSettings.upsert({
      where: { adminId: targetAdminId },
      update: updatePayload,
      create: { adminId: targetAdminId, ...updatePayload },
    })

    return {
      success: true,
      message: `${asset} uploaded successfully`,
      logoUrl: asset === 'logo' ? publicPath : settings.logoUrl,
      faviconUrl: asset === 'favicon' ? publicPath : settings.faviconUrl,
      brokerageLogoUrl: asset === 'brokerage' ? publicPath : settings.brokerageLogoUrl,
      asset,
      settings,
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Failed to upload logo:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to upload logo',
    })
  }
})
