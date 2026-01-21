import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { writeFile } from 'fs/promises'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    console.log('[UPLOAD AVATAR] Handler called')
    console.log('[UPLOAD AVATAR] event.context.user:', event.context.user)
    
    const userId = event.context.user?.id

    if (!userId) {
      console.error('[UPLOAD AVATAR] No user ID found in context')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }
    
    console.log('[UPLOAD AVATAR] User ID:', userId)

    // Get the uploaded file
    const formData = await readMultipartFormData(event)
    
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      })
    }

    const file = formData.find(item => item.name === 'avatar')
    
    if (!file || !file.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Avatar file is required'
      })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type || '')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed'
      })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.data.length > maxSize) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File size exceeds 5MB limit'
      })
    }

    // Generate unique filename
    const ext = path.extname(file.filename || '')
    const filename = `avatar-${userId}-${Date.now()}${ext}`
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    try {
      await fs.mkdir(uploadsDir, { recursive: true })
    } catch (err) {
      console.log('Directory already exists or error creating:', err)
    }

    // Save file
    const filePath = path.join(uploadsDir, filename)
    await writeFile(filePath, file.data)

    // Update user avatar in database
    const avatarUrl = `/uploads/avatars/${filename}`
    await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: avatarUrl
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'upload',
        entity: 'avatar',
        entityId: userId,
        description: 'Uploaded new avatar',
        ipAddress: getRequestIP(event),
        userAgent: getRequestHeader(event, 'user-agent')
      }
    })

    return { 
      success: true, 
      url: avatarUrl 
    }
  } catch (error: any) {
    console.error('Error uploading avatar:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to upload avatar'
    })
  }
})

