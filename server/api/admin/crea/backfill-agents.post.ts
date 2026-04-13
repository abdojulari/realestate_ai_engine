import { defineEventHandler, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { creaService } from '../../../utils/crea.service'
import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * POST /api/admin/crea/backfill-agents
 * Backfills listingAgentData and listingOfficeData for CREA properties
 * that are missing this data.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    // Find CREA properties with no agent data (DbNull for JSON fields)
    const properties = await prisma.property.findMany({
      where: {
        source: 'crea',
        externalId: { not: null },
        OR: [
          { listingAgentData: { equals: Prisma.DbNull } },
          { listingAgentData: { equals: Prisma.JsonNull } },
        ]
      },
      select: {
        id: true,
        externalId: true,
        features: true
      },
      take: 100
    })

    console.log(`📋 Found ${properties.length} CREA properties missing agent data`)

    const stats = { total: properties.length, updated: 0, failed: 0, skipped: 0 }

    for (const prop of properties) {
      try {
        const listingKey = prop.externalId
        if (!listingKey) { stats.skipped++; continue }

        // First try: use keys from features JSON directly (faster, no extra property fetch)
        const features = prop.features as any
        const agentKey = features?.listAgentKey
        const officeKey = features?.listOfficeKey

        let agent: any = null
        let office: any = null

        if (agentKey || officeKey) {
          try {
            const [agents, offices] = await Promise.all([
              agentKey ? creaService.getMembersByKeys([agentKey]) : Promise.resolve([]),
              officeKey ? creaService.getOfficesByKeys([officeKey]) : Promise.resolve([])
            ])
            agent = agents[0] || null
            office = offices[0] || null
          } catch (e: any) {
            console.warn(`⚠️ Key-based lookup failed for ${listingKey}:`, e.message)
          }
        }

        // Second try: full property fetch with agent details
        if (!agent && !office) {
          try {
            const details = await creaService.getPropertyWithAgentDetails(listingKey)
            agent = details.listingAgent
            office = details.listingOffice

            // Also save co-listing data if available
            if (details.coListingAgents.length > 0 || details.coListingOffices.length > 0) {
              const coData: any = {}
              if (details.coListingAgents.length > 0) {
                coData.coListingAgentsData = details.coListingAgents.map(a => ({
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
                coData.coListingOfficesData = details.coListingOffices.map(o => ({
                  officeKey: o.OfficeKey,
                  name: o.OfficeName,
                  phone: o.OfficePhone
                }))
              }
              if (agent || office) {
                await prisma.property.update({
                  where: { id: prop.id },
                  data: {
                    ...coData,
                    ...(agent ? {
                      listingAgentData: {
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
                    } : {}),
                    ...(office ? {
                      listingOfficeData: {
                        officeKey: office.OfficeKey,
                        officeId: office.OfficeId,
                        name: office.OfficeName,
                        phone: office.OfficePhone,
                        email: office.OfficeEmail,
                        address: [office.OfficeAddress1, office.OfficeAddress2].filter(Boolean).join(', '),
                        city: office.OfficeCity,
                        province: office.OfficeStateOrProvince,
                        postalCode: office.OfficePostalCode,
                        website: office.OfficeUrl
                      }
                    } : {})
                  }
                })
                stats.updated++
                console.log(`✅ Backfilled ${listingKey}: ${agent?.MemberFullName || 'N/A'} @ ${office?.OfficeName || 'N/A'}`)
                await new Promise(r => setTimeout(r, 200))
                continue
              }
            }
          } catch (e: any) {
            console.warn(`⚠️ Full fetch failed for ${listingKey}:`, e.message)
          }
        }

        if (!agent && !office) {
          stats.skipped++
          continue
        }

        // Update with whatever data we got
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
            city: office.OfficeCity,
            province: office.OfficeStateOrProvince,
            postalCode: office.OfficePostalCode,
            website: office.OfficeUrl
          }
        }

        await prisma.property.update({
          where: { id: prop.id },
          data: updateData
        })
        stats.updated++
        console.log(`✅ Updated ${listingKey}: ${agent?.MemberFullName || 'N/A'} @ ${office?.OfficeName || 'N/A'}`)

        await new Promise(r => setTimeout(r, 200))
      } catch (err: any) {
        stats.failed++
        console.error(`❌ Failed for property ${prop.id}:`, err.message)
      }
    }

    console.log('📋 Agent backfill complete:', stats)
    return { success: true, stats }
  } catch (err: any) {
    console.error('❌ Agent backfill error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: `Agent backfill failed: ${err.message}`
    })
  }
})
