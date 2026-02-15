import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../../utils/auth'
import { getTenantFilter } from '../../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { subject, content } = body

  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid template ID'
    })
  }

  try {
    // Verify ownership before updating
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: Number(id), ...tenantFilter }
    })
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Template not found' })
    }

    const template = await prisma.emailTemplate.update({
      where: {
        id: Number(id)
      },
      data: {
        subject,
        content,
        updatedAt: new Date()
      }
    })

    console.log('✅ Email template updated successfully:', template.name)

    return {
      success: true,
      template
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('❌ Failed to update email template:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update email template'
    })
  }
})
