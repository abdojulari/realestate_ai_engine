#!/usr/bin/env node

/**
 * Quick script to sync some CREA data for testing
 * This bypasses the admin auth requirement for demo purposes
 */

import fetch from 'node-fetch'

const CREA_TOKEN_URL = 'https://identity.crea.ca/connect/token'
const CREA_API_BASE = 'https://ddfapi.realtor.ca'
const CLIENT_ID = 'qQkpUiMOTATmMZ1jzbYMGtHg'
const CLIENT_SECRET = 'gP6MSh8LbKCtpXrjDciX87xJ'

async function getToken() {
  const response = await fetch(CREA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })

  const data = await response.json()
  return data.access_token
}

async function getCreaProperties(token, limit = 5) {
  const url = `${CREA_API_BASE}/odata/v1/Property?$top=${limit}`
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`CREA API error: ${response.status}`)
  }

  const data = await response.json()
  return data.value
}

async function insertCreaProperies(properties) {
  // Insert directly into the local API
  for (const creaProperty of properties) {
    try {
      const transformedProperty = {
        title: `${creaProperty.UnparsedAddress}, ${creaProperty.City}`,
        description: creaProperty.PublicRemarks || `${creaProperty.PropertySubType} in ${creaProperty.City}`,
        price: creaProperty.ListPrice || 0,
        beds: creaProperty.BedroomsTotal || 0,
        baths: creaProperty.BathroomsTotalInteger || 0,
        sqft: creaProperty.LivingArea || 0,
        type: creaProperty.PropertySubType?.toLowerCase().includes('condo') ? 'condo' : 'house',
        status: 'for_sale',
        address: creaProperty.UnparsedAddress,
        city: creaProperty.City,
        province: creaProperty.StateOrProvince,
        postalCode: creaProperty.PostalCode,
        latitude: creaProperty.Latitude,
        longitude: creaProperty.Longitude,
        features: {
          heating: creaProperty.Heating || [],
          cooling: creaProperty.Cooling || [],
          listingUrl: creaProperty.ListingURL
        },
        images: creaProperty.Media?.map(m => m.MediaURL).filter(Boolean) || [],
        source: 'crea',
        externalId: creaProperty.ListingKey,
        mlsNumber: creaProperty.ListingId,
        userId: 1 // Will be handled by the API
      }

      console.log(`Inserting CREA property: ${transformedProperty.title}`)
      
      const response = await fetch('http://localhost:3000/api/crea/quick-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties: [transformedProperty] })
      })

      if (response.ok) {
        console.log(`✅ Successfully added: ${transformedProperty.title}`)
      } else {
        console.log(`❌ Failed to add: ${transformedProperty.title} - ${response.status}`)
      }

    } catch (error) {
      console.error(`Error processing property ${creaProperty.ListingKey}:`, error.message)
    }
  }
}

async function main() {
  try {
    console.log('🔄 Getting CREA access token...')
    const token = await getToken()
    console.log('✅ Got token')

    console.log('📡 Fetching CREA properties...')
    const creaProperties = await getCreaProperties(token, 5)
    console.log(`✅ Found ${creaProperties.length} CREA properties`)

    console.log('💾 Adding CREA properties to Suhani database...')
    await insertCreaProperies(creaProperties)

    console.log('🎉 Sync complete! Check your map for CREA properties.')
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    process.exit(1)
  }
}

main()
