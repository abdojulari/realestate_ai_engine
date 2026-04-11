import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getTenantAdminId(user) || user.id
    const query = getQuery(event)
    const postId = query.id as string | undefined

    if (postId) {
      // Delete a single post
      await prisma.facebookPost.delete({
        where: { id: parseInt(postId), adminId }
      })
      return { success: true, message: 'Post deleted' }
    } else {
      // Clear all post history
      const result = await prisma.facebookPost.deleteMany({
        where: { adminId }
      })
      return { success: true, message: `Cleared ${result.count} posts` }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to delete posts'
    })
  }
})
