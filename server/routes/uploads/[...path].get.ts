import { defineEventHandler, createError, setHeader } from 'h3'
import { promises as fs } from 'fs'
import path from 'path'

const UPLOAD_ROOT = path.resolve(process.cwd(), 'public', 'uploads')

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
}

export default defineEventHandler(async (event) => {
  const filePath = event.context.params?.path
  if (!filePath) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file path' })
  }

  const resolved = path.resolve(UPLOAD_ROOT, filePath)
  if (!resolved.startsWith(UPLOAD_ROOT)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  try {
    const stat = await fs.stat(resolved)
    if (!stat.isFile()) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }

    const ext = path.extname(resolved).toLowerCase()
    const mime = MIME_MAP[ext] || 'application/octet-stream'
    setHeader(event, 'Content-Type', mime)
    setHeader(event, 'Cache-Control', 'public, max-age=2592000')
    setHeader(event, 'Content-Length', stat.size.toString())

    return fs.readFile(resolved)
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }
})
