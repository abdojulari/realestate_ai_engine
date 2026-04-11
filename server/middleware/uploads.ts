import { defineEventHandler, setHeader, createError } from 'h3'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getUploadRoot } from '../utils/uploadStorage'

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
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain; charset=utf-8',
}

const PREFIX = '/uploads/'

export default defineEventHandler(async (event) => {
  const pathname = event.path ?? ''
  if (!pathname.startsWith(PREFIX)) return

  const relative = pathname.slice(PREFIX.length)
  if (!relative || relative.includes('..')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const root = getUploadRoot()
  const abs = path.resolve(root, ...relative.split('/').filter(Boolean))

  if (!abs.startsWith(root + path.sep) && abs !== root) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  try {
    const stat = await fs.stat(abs)
    if (!stat.isFile()) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }

    const ext = path.extname(abs).toLowerCase()
    const mime = MIME_MAP[ext] || 'application/octet-stream'
    setHeader(event, 'Content-Type', mime)
    setHeader(event, 'Cache-Control', 'public, max-age=2592000')
    setHeader(event, 'Content-Length', stat.size.toString())

    return fs.readFile(abs)
  } catch (e: any) {
    if (e?.statusCode) throw e
    console.warn('[uploads] 404:', abs, e?.code || e?.message || '')
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }
})
