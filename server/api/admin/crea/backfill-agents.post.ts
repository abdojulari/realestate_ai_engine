import { defineEventHandler, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { creaService } from '../../../utils/crea.service'
import { getCanonicalCityName } from '../../../utils/city-dictionary'
import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * POST /api/admin/crea/backfill-agents
 * 
 * Strategy: Fetch a batch of active listings from CREA that we already have
 * in our DB but are missing agent data. For each, re-fetch from CREA API
 * to get the ListAgentKey/ListOfficeKey, then resolve to full agent details.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    // Find properties missing agent data
    const properties = await prisma.property.findMany({
      where: {
        source: 'crea',
        status: 'for_sale',
        externalId: { not: null },
        OR: [
          { listingAgentData: { equals: Prisma.DbNull } },
          { listingAgentData: { equals: Prisma.JsonNull } },
        ]
      },
      select: {
        id: true,
        externalId: true,
      },
      take: 50,
      orderBy: { updatedAt: 'desc' }
    })

    console.log(`📋 Found ${properties.length} active CREA properties missing agent data`)

    const stats = {
      total: properties.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      reasons: [] as string[]
    }

    for (const prop of properties) {
      const listingKey = prop.externalId!
      try {
        // Fetch the full property + agent details from CREA in one go
        const details = await creaService.getPropertyWithAgentDetails(listingKey)

        if (!details.property) {
          // Property no longer in CREA -- mark as expired
          await prisma.property.update({
            where: { id: prop.id },
            data: { status: 'expired' }
          })
          stats.skipped++
          stats.reasons.push(`${listingKey}: not in CREA anymore → marked expired`)
          continue
        }

        const agent = details.listingAgent
        const office = details.listingOffice

        if (!agent && !office) {
          // Property exists in CREA but Member/Office lookup returned nothing
          // Store the keys so future syncs can try again
          const agentKey = details.property.ListAgentKey
          const officeKey = details.property.ListOfficeKey
          stats.skipped++
          stats.reasons.push(`${listingKey}: property found but agent (key=${agentKey || 'none'}) / office (key=${officeKey || 'none'}) not resolved`)
          continue
        }

        const updateData: any = {}

        if (agent) {
          updateData.listingAgentData = {
            memberKey: agent.MemberKey,
            mlsId: agent.MemberMlsId,
            fullName: agent.MemberFullName,
            firstName: agent.MemberFirstName,
            lastName: agent.MemberLastName,
            email: agent.MemberEmail,
            directPhone: agent.MemberDirectPhone,
            mobilePhone: agent.MemberMobilePhone,
            officePhone: agent.MemberOfficePhone,
            license: agent.MemberStateLicense,
            designations: agent.MemberDesignation,
            photoURL: agent.MemberPhotoURL
          }
        }

        if (office) {
          updateData.listingOfficeData = {
            officeKey: office.OfficeKey,
            officeId: office.OfficeId,
            name: office.OfficeName,
            phone: office.OfficePhone,
            email: office.OfficeEmail,
            address: [office.OfficeAddress1, office.OfficeAddress2].filter(Boolean).join(', '),
            city: getCanonicalCityName(office.OfficeCity),
            province: office.OfficeStateOrProvince,
            postalCode: office.OfficePostalCode,
            website: office.OfficeUrl
          }
        }

        if (details.coListingAgents.length > 0) {
          updateData.coListingAgentsData = details.coListingAgents.map(a => ({
            memberKey: a.MemberKey,
            fullName: a.MemberFullName,
            firstName: a.MemberFirstName,
            lastName: a.MemberLastName,
            email: a.MemberEmail,
            directPhone: a.MemberDirectPhone,
            mobilePhone: a.MemberMobilePhone
          }))
        }

        if (details.coListingOffices.length > 0) {
          updateData.coListingOfficesData = details.coListingOffices.map(o => ({
            officeKey: o.OfficeKey,
            name: o.OfficeName,
            phone: o.OfficePhone
          }))
        }

        await prisma.property.update({
          where: { id: prop.id },
          data: updateData
        })

        stats.updated++
        console.log(`✅ ${listingKey}: ${agent?.MemberFullName || 'N/A'} @ ${office?.OfficeName || 'N/A'}`)

        // Rate limiting to avoid CREA throttling
        await new Promise(r => setTimeout(r, 300))
      } catch (err: any) {
        stats.failed++
        stats.reasons.push(`${listingKey}: ${err.message}`)
        console.error(`❌ ${listingKey}:`, err.message)
      }
    }

    // Only keep last 20 reasons to avoid huge response
    stats.reasons = stats.reasons.slice(0, 20)

    console.log('📋 Agent backfill complete:', { ...stats, reasons: stats.reasons.length })
    return { success: true, stats }
  } catch (err: any) {
    console.error('❌ Agent backfill error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: `Agent backfill failed: ${err.message}`
    })
  }
})
