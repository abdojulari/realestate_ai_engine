#!/usr/bin/env node

/**
 * Test script to demonstrate CREA Agent and Office data fetching
 * 
 * Usage:
 * node test-crea-agents.mjs [listingKey]
 * 
 * If no listingKey provided, it will fetch a few properties first and then
 * get agent details for the first one found.
 */

const BASE_URL = 'http://localhost:3000'

async function testCreaAgentFetching(listingKey) {
  try {
    console.log('🔍 Testing CREA Agent and Office Data Fetching')
    console.log('=' .repeat(50))
    
    if (!listingKey) {
      console.log('📋 No listing key provided, fetching sample properties first...')
      
      // First, let's sync a few properties to get some listing keys
      const syncResponse = await fetch(`${BASE_URL}/api/crea/sync-alberta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          limit: 5,
          city: 'Calgary' // Focus on Calgary for testing
        })
      })
      
      if (!syncResponse.ok) {
        throw new Error(`Sync failed: ${syncResponse.status}`)
      }
      
      const syncData = await syncResponse.json()
      console.log(`✅ Synced ${syncData.stats?.created || 0} new properties`)
      
      // Get the first property from our database to test with
      const propertiesResponse = await fetch(`${BASE_URL}/api/properties?limit=1&source=crea`)
      const propertiesData = await propertiesResponse.json()
      
      if (!propertiesData.properties?.length) {
        throw new Error('No CREA properties found in database')
      }
      
      listingKey = propertiesData.properties[0].externalId
      console.log(`📍 Using ListingKey: ${listingKey}`)
    }
    
    console.log('\n🔍 Fetching property with agent details...')
    
    // Test the new endpoint
    const response = await fetch(`${BASE_URL}/api/crea/property-with-agents?listingKey=${listingKey}`)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    console.log('\n📊 Results:')
    console.log('=' .repeat(30))
    
    // Property Info
    console.log(`🏠 Property: ${data.data.property.address}, ${data.data.property.city}`)
    console.log(`💰 Price: $${data.data.property.price?.toLocaleString() || 'N/A'}`)
    console.log(`🏷️  Type: ${data.data.property.propertyType}`)
    console.log(`🔑 MLS: ${data.data.property.listingId}`)
    
    // Listing Agent
    console.log('\n👤 Listing Agent:')
    if (data.data.listingAgent) {
      const agent = data.data.listingAgent
      console.log(`   Name: ${agent.fullName}`)
      console.log(`   MLS ID: ${agent.mlsId}`)
      console.log(`   Email: ${agent.email || 'Not provided'}`)
      console.log(`   Direct Phone: ${agent.directPhone || 'Not provided'}`)
      console.log(`   Mobile Phone: ${agent.mobilePhone || 'Not provided'}`)
      console.log(`   License: ${agent.license || 'Not provided'}`)
      if (agent.designations?.length) {
        console.log(`   Designations: ${agent.designations.join(', ')}`)
      }
      if (agent.photoURL) {
        console.log(`   Photo: ${agent.photoURL}`)
      }
    } else {
      console.log('   ❌ No listing agent data found')
    }
    
    // Listing Office
    console.log('\n🏢 Listing Office:')
    if (data.data.listingOffice) {
      const office = data.data.listingOffice
      console.log(`   Name: ${office.name}`)
      console.log(`   Phone: ${office.phone || 'Not provided'}`)
      console.log(`   Email: ${office.email || 'Not provided'}`)
      if (office.address1) {
        console.log(`   Address: ${office.address1}`)
        if (office.address2) console.log(`            ${office.address2}`)
        console.log(`            ${office.city}, ${office.province} ${office.postalCode}`)
      }
      if (office.website) {
        console.log(`   Website: ${office.website}`)
      }
    } else {
      console.log('   ❌ No listing office data found')
    }
    
    // Co-listing Agents
    if (data.data.coListingAgents?.length > 0) {
      console.log('\n👥 Co-listing Agents:')
      data.data.coListingAgents.forEach((agent, index) => {
        console.log(`   ${index + 1}. ${agent.fullName} (${agent.mlsId})`)
        if (agent.directPhone || agent.mobilePhone) {
          console.log(`      Phone: ${agent.directPhone || agent.mobilePhone}`)
        }
      })
    }
    
    // Co-listing Offices
    if (data.data.coListingOffices?.length > 0) {
      console.log('\n🏬 Co-listing Offices:')
      data.data.coListingOffices.forEach((office, index) => {
        console.log(`   ${index + 1}. ${office.name}`)
        if (office.phone) console.log(`      Phone: ${office.phone}`)
      })
    }
    
    // Relationship Keys (for debugging)
    console.log('\n🔗 CREA Relationship Keys:')
    console.log(`   ListAgentKey: ${data.data.property.listAgentKey}`)
    console.log(`   ListOfficeKey: ${data.data.property.listOfficeKey}`)
    if (data.data.property.coListAgentKey) {
      console.log(`   CoListAgentKey: ${data.data.property.coListAgentKey}`)
    }
    if (data.data.property.coListOfficeKey) {
      console.log(`   CoListOfficeKey: ${data.data.property.coListOfficeKey}`)
    }
    
    console.log('\n✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
const listingKey = process.argv[2]
testCreaAgentFetching(listingKey)
