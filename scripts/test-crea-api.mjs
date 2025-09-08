#!/usr/bin/env node

/**
 * Test CREA API directly to see raw property data
 */

import fetch from 'node-fetch'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function testCreaApi() {
  console.log('🧪 Testing CREA API directly...')
  
  try {
    // Get CREA token
    console.log('🔐 Getting CREA authentication token...')
    const tokenResponse = await fetch('https://identity.crea.ca/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'qQkpUiMOTATmMZ1jzbYMGtHg',
        client_secret: 'gP6MSh8LbKCtpXrjDciX87xJ',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get CREA token: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    const token = tokenData.access_token
    console.log('✅ Got CREA token')

    // First, let's check a large sample of CREA properties to understand the price distribution
    console.log('🔍 Step 1: Checking large sample of CREA properties...')
    
    // CREA has 100 property limit per query, so let's check multiple batches
    const totalSamplesToCheck = 500
    const batchSize = 100
    let allSampleProperties = []
    
    for (let skip = 0; skip < totalSamplesToCheck; skip += batchSize) {
      const sampleQuery = `$filter=StateOrProvince eq 'Alberta'&$top=${batchSize}&$skip=${skip}&$orderby=ListingKey desc`
      console.log(`📊 Batch ${Math.floor(skip/batchSize) + 1}: Getting ${batchSize} properties (skip ${skip})`)
      
      const sampleResponse = await fetch(`https://ddfapi.realtor.ca/odata/v1/Property?${sampleQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (!sampleResponse.ok) {
        const errorText = await sampleResponse.text()
        console.error(`❌ Batch ${Math.floor(skip/batchSize) + 1} failed:`, errorText)
        break
      }

      const sampleData = await sampleResponse.json()
      const batchProperties = sampleData.value || []
      
      console.log(`   ✅ Got ${batchProperties.length} properties in this batch`)
      allSampleProperties.push(...batchProperties)
      
      // Stop if we get less than expected (end of data)
      if (batchProperties.length < batchSize) {
        console.log('   📝 Reached end of available properties')
        break
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log(`\n📊 Total sample properties collected: ${allSampleProperties.length}`)
    
    // Analyze price distribution
    let pricesAnalysis = {
      total: allSampleProperties.length,
      withValidPrice: 0,
      withZeroPrice: 0,
      withNullPrice: 0,
      priceRange: { min: Infinity, max: 0 }
    }
    
    allSampleProperties.forEach(prop => {
      const listPrice = prop.ListPrice
      
      if (listPrice === null || listPrice === undefined) {
        pricesAnalysis.withNullPrice++
      } else if (listPrice === 0) {
        pricesAnalysis.withZeroPrice++
      } else if (listPrice > 0) {
        pricesAnalysis.withValidPrice++
        pricesAnalysis.priceRange.min = Math.min(pricesAnalysis.priceRange.min, listPrice)
        pricesAnalysis.priceRange.max = Math.max(pricesAnalysis.priceRange.max, listPrice)
      }
    })
    
    console.log(`\n📈 CREA Price Analysis (${allSampleProperties.length} sample properties):`)
    console.log(`   ✅ Properties with valid prices: ${pricesAnalysis.withValidPrice}`)
    console.log(`   ❓ Properties with NULL prices: ${pricesAnalysis.withNullPrice}`)
    console.log(`   🚫 Properties with ZERO prices: ${pricesAnalysis.withZeroPrice}`)
    if (pricesAnalysis.priceRange.min !== Infinity) {
      console.log(`   💰 Price range: $${pricesAnalysis.priceRange.min.toLocaleString()} - $${pricesAnalysis.priceRange.max.toLocaleString()}`)
    }
    
    // Show examples of null price properties
    if (pricesAnalysis.withNullPrice > 0) {
      console.log('\n📋 Examples of NULL price properties in CREA:')
      allSampleProperties.filter(p => p.ListPrice === null).slice(0, 5).forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.UnparsedAddress} (ListingKey: ${prop.ListingKey})`)
        console.log(`      PropertyType: ${prop.PropertyType}, PropertySubType: ${prop.PropertySubType}`)
      })
    }
    
    // Show examples of zero price properties if any
    if (pricesAnalysis.withZeroPrice > 0) {
      console.log('\n📋 Examples of ZERO price properties in CREA:')
      allSampleProperties.filter(p => p.ListPrice === 0).slice(0, 5).forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.UnparsedAddress} (ListingKey: ${prop.ListingKey})`)
        console.log(`      PropertyType: ${prop.PropertyType}, PropertySubType: ${prop.PropertySubType}`)
      })
    }
    
    console.log('\n🎯 CONCLUSION:')
    if (pricesAnalysis.withNullPrice > 0 || pricesAnalysis.withZeroPrice > 0) {
      console.log('✅ CREA DOES have properties with NULL/ZERO prices - these are VALID')
      console.log('❌ The deletion of 597 properties was INCORRECT')
      console.log('🔧 Need to restore deleted properties and fix display logic instead')
    } else {
      console.log('❌ CREA has NO properties with NULL/ZERO prices')
      console.log('✅ The deletion was justified')
    }

  } catch (error) {
    console.error('❌ CREA API test failed:', error.message)
  }
}

testCreaApi()
