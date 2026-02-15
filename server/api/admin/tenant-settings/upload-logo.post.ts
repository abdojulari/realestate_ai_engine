import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { promises as fs } from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'

const prisma = new PrismaClient()

/**
 * POST /api/admin/tenant-settings/upload-logo
 *
 * Upload a logo image, save to disk, and update TenantSettings.logoUrl.
 * Accepts multipart form data with a 'logo' file field.
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

  // ── Validate file type ────────────────────────────────────
  const extension = path.extname(filePart.filename).toLowerCase()
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  if (!allowedExtensions.includes(extension)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid file type: ${extension}. Allowed: ${allowedExtensions.join(', ')}`,
    })
  }

  try {
    // ── Ensure upload directory exists ─────────────────────────
    const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', 'logos')
    await fs.mkdir(uploadDir, { recursive: true })

    // ── Save file to disk ─────────────────────────────────────
    const cleanName = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const nameWithoutExt = path.basename(cleanName, extension)
    const filename = `${nameWithoutExt}_${Date.now()}${extension}`
    const filePath = path.join(uploadDir, filename)

    await fs.writeFile(filePath, filePart.data as Buffer)

    const logoUrl = `/uploads/logos/${filename}`

    // ── Upsert TenantSettings with the new logoUrl ────────────
    const settings = await prisma.tenantSettings.upsert({
      where: { adminId: targetAdminId },
      update: { logoUrl },
      create: { adminId: targetAdminId, logoUrl },
    })

    return {
      success: true,
      message: 'Logo uploaded successfully',
      logoUrl,
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
