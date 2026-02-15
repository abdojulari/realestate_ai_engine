import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { requireTenantAccess } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)

    const { checklistItemId, isCompleted } = body

    if (!checklistItemId || isCompleted === undefined) {
      throw createError({ statusCode: 400, message: 'Checklist item ID and completion status required' })
    }

    // Get checklist item and verify access via transaction
    const item = await prisma.crmChecklistItem.findUnique({
      where: { id: checklistItemId },
      include: { transaction: true }
    })

    if (!item) throw createError({ statusCode: 404, message: 'Checklist item not found' })
    requireTenantAccess(user, item.transaction.adminId)

    // Toggle the item
    await prisma.crmChecklistItem.update({
      where: { id: checklistItemId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completedBy: isCompleted ? user.id : null
      }
    })

    // Recalculate transaction progress
    const allItems = await prisma.crmChecklistItem.findMany({
      where: { transactionId: item.transactionId }
    })

    const requiredItems = allItems.filter(i => i.isRequired)
    const completedRequired = requiredItems.filter(i =>
      i.id === checklistItemId ? isCompleted : i.isCompleted
    )

    const progress = requiredItems.length > 0
      ? Math.round((completedRequired.length / requiredItems.length) * 100)
      : 0

    // Determine current stage based on latest completed item
    const completedItems = allItems
      .filter(i => i.id === checklistItemId ? isCompleted : i.isCompleted)
      .sort((a, b) => b.sortOrder - a.sortOrder)

    const currentStage = completedItems[0]?.category || 'initial'

    // Determine status based on progress
    let status = item.transaction.status
    if (progress === 100) {
      status = 'closed'
    } else if (progress >= 70 && status === 'active') {
      // Auto-advance to conditional if past a certain point
      const conditionsRemoved = allItems.some(i =>
        i.category === 'conditions' &&
        (i.id === checklistItemId ? isCompleted : i.isCompleted)
      )
      if (conditionsRemoved) status = 'firm'
    }

    await prisma.crmTransaction.update({
      where: { id: item.transactionId },
      data: { progress, currentStage, status }
    })

    return {
      success: true,
      progress,
      currentStage,
      status,
      message: isCompleted ? 'Item completed' : 'Item unchecked'
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
