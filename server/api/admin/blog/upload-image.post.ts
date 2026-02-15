import { defineEventHandler, readMultipartFormData } from 'h3'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { requireAdmin } from '../../../utils/auth'

/**
 * Upload Blog Image
 * POST /api/admin/blog/upload-image
 * 
 * Handles image uploads for blog posts (cover images, inline images)
 * Requires admin authentication
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  
  try {
    const formData = await readMultipartFormData(event)
    
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      })
    }
    
    const file = formData.find(f => f.name === 'image' || f.name === 'file')
    
    if (!file || !file.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No image file found'
      })
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type || '')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP'
      })
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.data.length > maxSize) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File too large. Maximum size is 5MB'
      })
    }
    
    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'blog')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }
    
    // Generate unique filename
    const ext = file.filename?.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `blog-${timestamp}-${randomStr}.${ext}`
    
    // Save file
    const filePath = join(uploadDir, filename)
    await writeFile(filePath, file.data)
    
    // Return public URL
    const publicUrl = `/uploads/blog/${filename}`
    
    return {
      success: true,
      url: publicUrl,
      filename
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[Blog Upload] Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to upload image'
    })
  }
})
