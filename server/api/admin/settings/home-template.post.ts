import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { template } = body

  // Validate template number (1-5)
  if (!template || template < 1 || template > 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Template must be a number between 1 and 5'
    })
  }

  try {
    // Upsert the home template setting
    await prisma.setting.upsert({
      where: { key: 'site.homeTemplate' },
      update: { value: String(template) },
      create: { key: 'site.homeTemplate', value: String(template) }
    })

    // Verify it was saved
    const savedSetting = await prisma.setting.findUnique({
      where: { key: 'site.homeTemplate' }
    })
    
    console.log(`✅ Home template updated to template ${template}`)
    console.log(`📝 Verified saved value: ${savedSetting?.value}`)

    return {
      success: true,
      message: `Home template updated to template ${template}`,
      template: template
    }
  } catch (error: any) {
    console.error('❌ Failed to update home template:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update home template'
    })
  }
})
