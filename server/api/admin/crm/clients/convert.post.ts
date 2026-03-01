import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate, requireTenantAccess } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)

    const { clientId, type, propertyAddress, salePrice, notes } = body

    if (!clientId || !type) {
      throw createError({ statusCode: 400, message: 'Client ID and transaction type are required' })
    }

    if (!['buying', 'selling'].includes(type)) {
      throw createError({ statusCode: 400, message: 'Type must be "buying" or "selling"' })
    }

    // Verify client exists and belongs to tenant
    const client = await prisma.crmClient.findUnique({ where: { id: clientId } })
    if (!client) throw createError({ statusCode: 404, message: 'Client not found' })
    requireTenantAccess(user, client.adminId)

    // Update client type based on transaction
    const clientType = type === 'buying' ? 'buyer' : 'seller'
    await prisma.crmClient.update({
      where: { id: clientId },
      data: { type: clientType }
    })

    // Create transaction with default checklist
    const checklist = type === 'buying' ? getBuyerChecklist() : getSellerChecklist()

    const transaction = await prisma.crmTransaction.create({
      data: {
        clientId,
        type,
        propertyAddress,
        salePrice,
        notes,
        status: 'active',
        currentStage: checklist[0]?.category || 'initial',
        progress: 0,
        adminId: getAdminIdForCreate(user),
        checklist: {
          create: checklist.map((item, index) => ({
            label: item.label,
            description: item.description,
            category: item.category,
            sortOrder: index,
            isRequired: (item as any).isRequired !== false,
          }))
        }
      },
      include: {
        checklist: { orderBy: { sortOrder: 'asc' } }
      }
    })

    return {
      success: true,
      message: `Client converted to ${clientType} with ${type} transaction`,
      transaction
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

function getBuyerChecklist() {
  return [
    { label: 'Send Consumer Guide', description: 'Send the buyer consumer guide document', category: 'initial' },
    { label: 'Sign Buyer Representation Agreement', description: 'Get signed buyer representation agreement', category: 'initial' },
    { label: 'Mortgage Pre-Approval', description: 'Confirm mortgage pre-approval from lender', category: 'pre-approval' },
    { label: 'Define Search Criteria', description: 'Document buyer preferences and requirements', category: 'pre-approval' },
    { label: 'Schedule Showings', description: 'Schedule property viewings based on criteria', category: 'showing' },
    { label: 'Property Viewings Completed', description: 'Complete all scheduled viewings', category: 'showing' },
    { label: 'Submit Offer', description: 'Draft and submit offer on selected property', category: 'offer' },
    { label: 'Offer Accepted / Counter', description: 'Negotiate and finalize accepted offer', category: 'offer' },
    { label: 'Home Inspection', description: 'Schedule and complete home inspection', category: 'conditions' },
    { label: 'Financing Condition', description: 'Satisfy financing condition with lender', category: 'conditions' },
    { label: 'Conditions Removal', description: 'Remove all conditions from offer', category: 'conditions' },
    { label: 'Lawyer / Notary Engaged', description: 'Engage lawyer or notary for closing', category: 'closing' },
    { label: 'Final Walkthrough', description: 'Complete final walkthrough before closing', category: 'closing' },
    { label: 'Possession / Closing', description: 'Complete possession and closing process', category: 'closing' },
  ]
}

function getSellerChecklist() {
  return [
    { label: 'Send Seller Guide', description: 'Send the seller guide document', category: 'initial' },
    { label: 'Listing Agreement Signed', description: 'Get signed listing agreement', category: 'initial' },
    { label: 'Property Assessment', description: 'Complete Comparative Market Analysis (CMA)', category: 'initial' },
    { label: 'Photography Scheduled', description: 'Schedule professional photography session', category: 'preparation' },
    { label: 'Photography Completed', description: 'Professional photos and virtual tour ready', category: 'preparation' },
    { label: 'Staging (if applicable)', description: 'Stage property for showings', category: 'preparation', isRequired: false },
    { label: 'Listing Description Written', description: 'Create compelling listing description', category: 'preparation' },
    { label: 'Listing Live on MLS', description: 'Publish listing to MLS system', category: 'active' },
    { label: 'Marketing Campaign Launched', description: 'Launch digital marketing campaign', category: 'active' },
    { label: 'Open House Scheduled', description: 'Schedule open house events', category: 'active', isRequired: false },
    { label: 'Offers Received', description: 'Review received offers', category: 'offer' },
    { label: 'Offer Accepted', description: 'Accept best offer', category: 'offer' },
    { label: 'Conditions Satisfied', description: 'Buyer satisfies all conditions', category: 'conditions' },
    { label: 'Firm Sale', description: 'Sale is firm - conditions removed', category: 'closing' },
    { label: 'Lawyer / Notary Engaged', description: 'Engage lawyer or notary for closing', category: 'closing' },
    { label: 'Closing Completed', description: 'Complete closing process and hand over keys', category: 'closing' },
  ]
}
