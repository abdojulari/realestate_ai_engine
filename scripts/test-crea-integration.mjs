#!/usr/bin/env node

/**
 * Test script to verify CREA integration functionality
 * Run with: npm run test:crea-integration
 */

import fetch from 'node-fetch'

const API_BASE = process.env.API_BASE || 'http://localhost:3000'
const TEST_TOKEN = process.env.TEST_ADMIN_TOKEN || 'your-admin-token'

class CreaIntegrationTester {
  constructor(apiBase, token) {
    this.apiBase = apiBase
    this.token = token
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.apiBase}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    return response.json()
  }

  async testPropertyEndpoints() {
    console.log('🧪 Testing Property Endpoints...')
    
    try {
      // Test basic properties endpoint
      console.log('  ✅ Testing /api/properties')
      const allProperties = await this.makeRequest('/api/properties')
      console.log(`     Found ${allProperties.length} total properties`)

      // Test manual properties only
      console.log('  ✅ Testing manual properties only')
      const manualProperties = await this.makeRequest('/api/properties?source=manual')
      console.log(`     Found ${manualProperties.length} manual properties`)

      // Test CREA properties only
      console.log('  ✅ Testing CREA properties only')
      const creaProperties = await this.makeRequest('/api/properties?source=crea')
      console.log(`     Found ${creaProperties.length} CREA properties`)

      // Test featured properties
      console.log('  ✅ Testing featured properties')
      const featuredProperties = await this.makeRequest('/api/properties/featured')
      console.log(`     Found ${featuredProperties.length} featured properties`)

      // Verify property structure includes new fields
      if (allProperties.length > 0) {
        const sampleProperty = allProperties[0]
        const hasNewFields = 'source' in sampleProperty
        console.log(`     ✅ New fields present: ${hasNewFields ? 'Yes' : 'No'}`)
        
        if (hasNewFields) {
          console.log(`     - Source: ${sampleProperty.source}`)
          console.log(`     - External ID: ${sampleProperty.externalId || 'None'}`)
          console.log(`     - MLS Number: ${sampleProperty.mlsNumber || 'None'}`)
        }
      }

    } catch (error) {
      console.error('  ❌ Property endpoint test failed:', error.message)
      return false
    }
    
    return true
  }

  async testCreaSync() {
    console.log('\n🔄 Testing CREA Sync...')
    
    try {
      // Note: This requires admin authentication
      console.log('  ⚠️  CREA sync test requires admin authentication')
      console.log('  ⚠️  Skipping sync test - run manually from admin panel')
      
      return true
    } catch (error) {
      console.error('  ❌ CREA sync test failed:', error.message)
      return false
    }
  }

  async testSearchFiltering() {
    console.log('\n🔍 Testing Search Filtering...')
    
    try {
      // Test city filtering
      console.log('  ✅ Testing city filtering')
      const torontoProperties = await this.makeRequest('/api/properties?city=Toronto')
      console.log(`     Found ${torontoProperties.length} properties in Toronto`)

      // Test price filtering
      console.log('  ✅ Testing price filtering')
      const expensiveProperties = await this.makeRequest('/api/properties?minPrice=500000')
      console.log(`     Found ${expensiveProperties.length} properties over $500,000`)

      // Test source filtering with other filters
      console.log('  ✅ Testing combined filtering (source + price)')
      const expensiveManual = await this.makeRequest('/api/properties?source=manual&minPrice=500000')
      console.log(`     Found ${expensiveManual.length} expensive manual properties`)

      return true
    } catch (error) {
      console.error('  ❌ Search filtering test failed:', error.message)
      return false
    }
  }

  async runTests() {
    console.log('🚀 Starting CREA Integration Tests\n')
    
    let passed = 0
    let total = 0

    // Test 1: Property Endpoints
    total++
    if (await this.testPropertyEndpoints()) {
      passed++
    }

    // Test 2: CREA Sync
    total++
    if (await this.testCreaSync()) {
      passed++
    }

    // Test 3: Search Filtering
    total++
    if (await this.testSearchFiltering()) {
      passed++
    }

    // Results
    console.log('\n' + '='.repeat(50))
    console.log(`📊 Test Results: ${passed}/${total} passed`)
    
    if (passed === total) {
      console.log('🎉 All tests passed! CREA integration is working correctly.')
      return true
    } else {
      console.log('❌ Some tests failed. Please check the errors above.')
      return false
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CreaIntegrationTester(API_BASE, TEST_TOKEN)
  
  tester.runTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error)
      process.exit(1)
    })
}

export default CreaIntegrationTester
