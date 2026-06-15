import { requireAdmin } from '../../../../utils/auth'
import { requireTenantAccess } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Coerce numeric input from a JSON body to a finite number, or `null`.
 *
 * Vuetify's `v-text-field type="number"` ships its value to the server as a
 * STRING ("330162.57"), which Prisma 6 refuses to accept for a `Float?`
 * column — that's how this endpoint was 500ing before. We accept either
 * number or string, parse with `Number()`, and reject anything that isn't a
 * finite, non-negative value (negative sale prices don't exist for a CRM
 * conversion).
 */
function coerceSalePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return null
  if (n < 0) return null
  return n
}

function coerceClientId(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) return raw
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return parseInt(raw, 10)
  return null
}

function coerceOptionalString(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)

    const clientId = coerceClientId(body?.clientId)
    const type = body?.type
    const propertyAddress = coerceOptionalString(body?.propertyAddress)
    const salePrice = coerceSalePrice(body?.salePrice)
    const notes = coerceOptionalString(body?.notes)

    if (!clientId) {
      throw createError({ statusCode: 400, message: 'A valid client ID is required' })
    }
    if (!type) {
      throw createError({ statusCode: 400, message: 'Transaction type is required' })
    }
    if (!['buying', 'selling'].includes(type)) {
      throw createError({ statusCode: 400, message: 'Type must be "buying" or "selling"' })
    }

    // Verify client exists and the caller has access to the tenant that owns it.
    const client = await prisma.crmClient.findUnique({ where: { id: clientId } })
    if (!client) throw createError({ statusCode: 404, message: 'Client not found' })
    requireTenantAccess(user, client.adminId)

    // Strict tenancy: a client always carries an `adminId` once owned. If a
    // legacy row has `adminId == null` we refuse rather than guess — that's
    // safer than attaching a transaction to the wrong tenant.
    if (client.adminId == null) {
      throw createError({
        statusCode: 409,
        message: 'This client is not attached to a tenant — please re-create or assign an owner before converting.',
      })
    }

    // The transaction MUST live in the same tenant as the client. We do NOT
    // use `getAdminIdForCreate(user)` here because a super_admin converting
    // another tenant's client would otherwise pull the transaction into the
    // super_admin's tenant — silently splitting the client/transaction pair
    // across tenants. Always anchor to `client.adminId`.
    const transactionAdminId = client.adminId

    const clientType = type === 'buying' ? 'buyer' : 'seller'
    const checklist = type === 'buying' ? getBuyerChecklist() : getSellerChecklist()

    // Wrap the client-type update + transaction create in a single transaction
    // so we never end up with a buyer-typed client and no transaction (or
    // vice versa) on partial failure.
    const result = await prisma.$transaction(async (tx) => {
      await tx.crmClient.update({
        where: { id: clientId },
        data: { type: clientType },
      })

      return tx.crmTransaction.create({
        data: {
          clientId,
          type,
          propertyAddress,
          salePrice,
          notes,
          status: 'active',
          currentStage: checklist[0]?.category || 'initial',
          progress: 0,
          adminId: transactionAdminId,
          checklist: {
            create: checklist.map((item, index) => ({
              label: item.label,
              description: item.description,
              category: item.category,
              sortOrder: index,
              isRequired: (item as any).isRequired !== false,
            })),
          },
        },
        include: {
          checklist: { orderBy: { sortOrder: 'asc' } },
        },
      })
    })

    return {
      success: true,
      message: `Client converted to ${clientType} with ${type} transaction`,
      transaction: result,
    }
  } catch (error: any) {
    // Without this log the raw Prisma validation error never reaches the
    // server console — every failure looked like a generic 500.
    console.error('[crm/clients/convert] failed:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    })
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
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
