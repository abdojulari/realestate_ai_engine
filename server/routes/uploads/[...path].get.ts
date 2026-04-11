import { defineEventHandler, createError, setHeader } from 'h3'
import { promises as fs } from 'node:fs'
import { getUploadRoot, resolveSafeUploadFile } from '../../utils/uploadStorage'

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain; charset=utf-8',
}

export default defineEventHandler(async (event) => {
  const resolved = resolveSafeUploadFile(event.context.params?.path as string | string[] | undefined)

  try {
    const stat = await fs.stat(resolved)
    if (!stat.isFile()) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }

    const ext = resolved.toLowerCase().slice(resolved.lastIndexOf('.'))
    const mime = MIME_MAP[ext] || 'application/octet-stream'
    setHeader(event, 'Content-Type', mime)
    setHeader(event, 'Cache-Control', 'public, max-age=2592000')
    setHeader(event, 'Content-Length', stat.size.toString())

    return fs.readFile(resolved)
  } catch (e: any) {
    if (e?.statusCode) throw e
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[uploads]', getUploadRoot(), event.context.params?.path, e?.message || e)
    }
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }
})
