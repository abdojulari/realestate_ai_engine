import { defineEventHandler, getQuery, createError } from 'h3'
import { creaService } from '../../utils/crea.service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { listingKey } = query

  if (!listingKey || typeof listingKey !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'listingKey parameter is required'
    })
  }

  try {
    console.log(`🔍 Fetching property with agent details for ListingKey: ${listingKey}`)
    
    // Get property with complete agent and office information
    const propertyData = await creaService.getPropertyWithAgentDetails(listingKey)
    
    if (!propertyData.property) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Property not found'
      })
    }

    console.log(`✅ Found property: ${propertyData.property.UnparsedAddress}`)
    console.log(`📋 Listing Agent: ${propertyData.listingAgent?.MemberFullName || 'Not found'}`)
    console.log(`🏢 Listing Office: ${propertyData.listingOffice?.OfficeName || 'Not found'}`)
    console.log(`👥 Co-listing Agents: ${propertyData.coListingAgents.length}`)
    console.log(`🏬 Co-listing Offices: ${propertyData.coListingOffices.length}`)

    return {
      success: true,
      data: {
        property: {
          listingKey: propertyData.property.ListingKey,
          listingId: propertyData.property.ListingId,
          address: propertyData.property.UnparsedAddress,
          city: propertyData.property.City,
          price: propertyData.property.ListPrice,
          propertyType: propertyData.property.PropertySubType,
          
          // Agent relationship keys
          listAgentKey: propertyData.property.ListAgentKey,
          listOfficeKey: propertyData.property.ListOfficeKey,
          coListAgentKey: propertyData.property.CoListAgentKey,
          coListOfficeKey: propertyData.property.CoListOfficeKey,
          coListAgentKey2: propertyData.property.CoListAgentKey2,
          coListOfficeKey2: propertyData.property.CoListOfficeKey2,
          coListAgentKey3: propertyData.property.CoListAgentKey3,
          coListOfficeKey3: propertyData.property.CoListOfficeKey3,
        },
        
        listingAgent: propertyData.listingAgent ? {
          memberKey: propertyData.listingAgent.MemberKey,
          mlsId: propertyData.listingAgent.MemberMlsId,
          fullName: propertyData.listingAgent.MemberFullName,
          firstName: propertyData.listingAgent.MemberFirstName,
          lastName: propertyData.listingAgent.MemberLastName,
          email: propertyData.listingAgent.MemberEmail,
          directPhone: propertyData.listingAgent.MemberDirectPhone,
          mobilePhone: propertyData.listingAgent.MemberMobilePhone,
          officePhone: propertyData.listingAgent.MemberOfficePhone,
          license: propertyData.listingAgent.MemberStateLicense,
          designations: propertyData.listingAgent.MemberDesignation,
          photoURL: propertyData.listingAgent.MemberPhotoURL
        } : null,
        
        listingOffice: propertyData.listingOffice ? {
          officeKey: propertyData.listingOffice.OfficeKey,
          officeId: propertyData.listingOffice.OfficeId,
          name: propertyData.listingOffice.OfficeName,
          phone: propertyData.listingOffice.OfficePhone,
          email: propertyData.listingOffice.OfficeEmail,
          address1: propertyData.listingOffice.OfficeAddress1,
          address2: propertyData.listingOffice.OfficeAddress2,
          city: propertyData.listingOffice.OfficeCity,
          province: propertyData.listingOffice.OfficeStateOrProvince,
          postalCode: propertyData.listingOffice.OfficePostalCode,
          country: propertyData.listingOffice.OfficeCountry,
          website: propertyData.listingOffice.OfficeWebsiteURL,
          brokerKey: propertyData.listingOffice.OfficeBrokerKey,
          brokerMlsId: propertyData.listingOffice.OfficeBrokerMlsId
        } : null,
        
        coListingAgents: propertyData.coListingAgents.map(agent => ({
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
        })),
        
        coListingOffices: propertyData.coListingOffices.map(office => ({
          officeKey: office.OfficeKey,
          officeId: office.OfficeId,
          name: office.OfficeName,
          phone: office.OfficePhone,
          email: office.OfficeEmail,
          address1: office.OfficeAddress1,
          address2: office.OfficeAddress2,
          city: office.OfficeCity,
          province: office.OfficeStateOrProvince,
          postalCode: office.OfficePostalCode,
          country: office.OfficeCountry,
          website: office.OfficeWebsiteURL,
          brokerKey: office.OfficeBrokerKey,
          brokerMlsId: office.OfficeBrokerMlsId
        }))
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching property with agent details:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch property with agent details: ${error.message}`
    })
  }
})
