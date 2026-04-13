import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { creaService } from '../../../utils/crea.service'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * POST /api/admin/crea/backfill-agents
 * Backfills listingAgentData and listingOfficeData for CREA properties
 * that are missing this data. Uses the ListAgentKey/ListOfficeKey stored
 * in the features JSON, or re-fetches from CREA API.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const properties = await prisma.property.findMany({
    where: {
      source: 'crea',
      listingAgentData: null,
      externalId: { not: null }
    },
    select: {
      id: true,
      externalId: true,
      features: true
    },
    take: 200
  })

  console.log(`📋 Found ${properties.length} CREA properties missing agent data`)

  const stats = { total: properties.length, updated: 0, failed: 0, skipped: 0 }

  for (const prop of properties) {
    try {
      const listingKey = prop.externalId
      if (!listingKey) { stats.skipped++; continue }

      // Try to get agent details from CREA API
      const details = await creaService.getPropertyWithAgentDetails(listingKey)

      if (!details.listingAgent && !details.listingOffice) {
        // Try using keys from features JSON
        const features = prop.features as any
        const agentKey = features?.listAgentKey
        const officeKey = features?.listOfficeKey

        if (agentKey || officeKey) {
          const [agents, offices] = await Promise.all([
            agentKey ? creaService.getMembersByKeys([agentKey]) : Promise.resolve([]),
            officeKey ? creaService.getOfficesByKeys([officeKey]) : Promise.resolve([])
          ])

          const agent = agents[0]
          const office = offices[0]

          if (agent || office) {
            await prisma.property.update({
              where: { id: prop.id },
              data: {
                listingAgentData: agent ? {
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
                } : undefined,
                listingOfficeData: office ? {
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
                } : undefined
              }
            })
            stats.updated++
            console.log(`✅ Updated agent for ${listingKey}: ${agent?.MemberFullName || 'N/A'} @ ${office?.OfficeName || 'N/A'}`)
            continue
          }
        }

        stats.skipped++
        continue
      }

      // Got data from the full property fetch
      const agent = details.listingAgent
      const office = details.listingOffice

      await prisma.property.update({
        where: { id: prop.id },
        data: {
          listingAgentData: agent ? {
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
          } : undefined,
          listingOfficeData: office ? {
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
          } : undefined,
          coListingAgentsData: details.coListingAgents.length > 0 ? details.coListingAgents.map(a => ({
            memberKey: a.MemberKey,
            fullName: a.MemberFullName,
            firstName: a.MemberFirstName,
            lastName: a.MemberLastName,
            email: a.MemberEmail,
            directPhone: a.MemberDirectPhone,
            mobilePhone: a.MemberMobilePhone
          })) : undefined,
          coListingOfficesData: details.coListingOffices.length > 0 ? details.coListingOffices.map(o => ({
            officeKey: o.OfficeKey,
            name: o.OfficeName,
            phone: o.OfficePhone
          })) : undefined
        }
      })
      stats.updated++
      console.log(`✅ Backfilled agent for ${listingKey}: ${agent?.MemberFullName || 'N/A'} @ ${office?.OfficeName || 'N/A'}`)

      // Rate limiting: 200ms delay between API calls
      await new Promise(r => setTimeout(r, 200))
    } catch (err: any) {
      stats.failed++
      console.error(`❌ Failed for property ${prop.id}:`, err.message)
    }
  }

  console.log('📋 Agent backfill complete:', stats)
  return { success: true, stats }
})
