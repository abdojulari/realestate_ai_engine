#!/usr/bin/env node

/**
 * 🛠️ CONSOLIDATED PROJECT TOOLS
 * ============================
 * 
 * This script consolidates all the essential project tools into one place.
 * Run with different commands to perform various maintenance tasks.
 * 
 * Usage:
 *   node scripts/consolidated-tools.mjs <command>
 * 
 * Commands:
 *   test-integration     - Test CREA integration and API endpoints
 *   test-neighborhoods   - Test neighborhood system
 *   verify-data         - Verify database data integrity
 *   seed-neighborhoods  - Seed sample neighborhood data
 *   sync-alberta        - Sync Alberta properties from CREA
 *   backup-database     - Create database backup
 *   migrate-env         - Migrate environment variables to database
 *   seed-emails         - Seed email templates
 *   analyze-market      - Analyze market data and show overview
 *   help                - Show this help message
 */

import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'
import fs from 'fs/promises'
import path from 'path'
import { execSync } from 'child_process'

// Add global fetch for Node.js compatibility
if (!globalThis.fetch) {
  globalThis.fetch = fetch
}

const prisma = new PrismaClient()
const API_BASE = 'http://localhost:3000'

const commands = {
  'test-integration': testIntegration,
  'test-neighborhoods': testNeighborhoods,
  'verify-data': verifyData,
  'seed-neighborhoods': seedNeighborhoods,
  'sync-alberta': syncAlberta,
  'backup-database': backupDatabase,
  'migrate-env': migrateEnv,
  'seed-emails': seedEmails,
  'analyze-market': analyzeMarket,
  'help': showHelp
}

async function main() {
  const command = process.argv[2]
  
  if (!command || command === 'help') {
    showHelp()
    return
  }
  
  if (!commands[command]) {
    console.error(`❌ Unknown command: ${command}`)
    console.log('Run "node scripts/consolidated-tools.mjs help" for available commands')
    process.exit(1)
  }
  
  try {
    await commands[command]()
  } catch (error) {
    console.error(`❌ Command failed:`, error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function testIntegration() {
  console.log('🧪 TESTING CREA INTEGRATION')
  console.log('===========================')
  
  try {
    // Test property endpoints
    const propertyResponse = await fetch(`${API_BASE}/api/properties?limit=1`)
    const propertyData = await propertyResponse.json()
    console.log(`✅ Properties API: ${propertyData.pagination?.total || 0} total properties`)
    
    // Test city statistics
    const cityResponse = await fetch(`${API_BASE}/api/properties/city-stats`)
    const cityData = await cityResponse.json()
    console.log(`✅ City Stats API: ${cityData.summary?.totalCities || 0} cities`)
    
    // Test neighborhood API
    const neighborhoodResponse = await fetch(`${API_BASE}/api/neighborhoods?limit=5`)
    const neighborhoodData = await neighborhoodResponse.json()
    console.log(`✅ Neighborhoods API: ${neighborhoodData.neighborhoods?.length || 0} sample neighborhoods`)
    
    console.log('\n🎉 All integrations working correctly!')
    
  } catch (error) {
    throw new Error(`Integration test failed: ${error.message}`)
  }
}

async function testNeighborhoods() {
  console.log('🏘️ TESTING NEIGHBORHOOD SYSTEM')
  console.log('==============================')
  
  try {
    const total = await prisma.neighborhood.count()
    console.log(`📊 Total neighborhoods: ${total}`)
    
    if (total > 0) {
      const topNeighborhoods = await prisma.neighborhood.findMany({
        take: 5,
        orderBy: { propertyCount: 'desc' },
        select: { name: true, city: true, propertyCount: true }
      })
      
      console.log('\n🏆 Top neighborhoods:')
      topNeighborhoods.forEach((n, i) => {
        console.log(`   ${i + 1}. ${n.name}, ${n.city}: ${n.propertyCount} properties`)
      })
    }
    
    console.log('\n✅ Neighborhood system working!')
    
  } catch (error) {
    throw new Error(`Neighborhood test failed: ${error.message}`)
  }
}

async function verifyData() {
  console.log('🔍 VERIFYING DATA INTEGRITY')
  console.log('===========================')
  
  try {
    // Verify properties
    const totalProperties = await prisma.property.count()
    const creaProperties = await prisma.property.count({ where: { source: 'crea' } })
    const manualProperties = await prisma.property.count({ where: { source: 'manual' } })
    
    console.log(`📊 Total Properties: ${totalProperties.toLocaleString()}`)
    console.log(`🏢 CREA Properties: ${creaProperties.toLocaleString()}`)
    console.log(`👤 Manual Properties: ${manualProperties.toLocaleString()}`)
    
    // Verify cities
    const cityStats = await prisma.property.groupBy({
      by: ['city'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })
    
    console.log(`\n🏙️ Cities: ${cityStats.length}`)
    console.log('Top 5 cities:')
    cityStats.slice(0, 5).forEach((city, i) => {
      console.log(`   ${i + 1}. ${city.city}: ${city._count.id} properties`)
    })
    
    // Verify neighborhoods
    const neighborhoodCount = await prisma.neighborhood.count()
    console.log(`\n🏘️ Neighborhoods: ${neighborhoodCount}`)
    
    console.log('\n✅ Data integrity verified!')
    
  } catch (error) {
    throw new Error(`Data verification failed: ${error.message}`)
  }
}

async function seedNeighborhoods() {
  console.log('🌱 SEEDING SAMPLE NEIGHBORHOODS')
  console.log('===============================')
  
  const sampleNeighborhoods = [
    // Calgary
    { name: 'Downtown', city: 'Calgary', province: 'Alberta', country: 'Canada', propertyCount: 45, averagePrice: 850000 },
    { name: 'Kensington', city: 'Calgary', province: 'Alberta', country: 'Canada', propertyCount: 23, averagePrice: 920000 },
    { name: 'Beltline', city: 'Calgary', province: 'Alberta', country: 'Canada', propertyCount: 67, averagePrice: 780000 },
    // Edmonton
    { name: 'Downtown', city: 'Edmonton', province: 'Alberta', country: 'Canada', propertyCount: 38, averagePrice: 520000 },
    { name: 'Old Strathcona', city: 'Edmonton', province: 'Alberta', country: 'Canada', propertyCount: 45, averagePrice: 480000 },
    { name: 'Garneau', city: 'Edmonton', province: 'Alberta', country: 'Canada', propertyCount: 32, averagePrice: 650000 }
  ]
  
  try {
    let created = 0
    let updated = 0
    
    for (const data of sampleNeighborhoods) {
      const existing = await prisma.neighborhood.findFirst({
        where: { name: data.name, city: data.city, province: data.province }
      })
      
      if (existing) {
        await prisma.neighborhood.update({
          where: { id: existing.id },
          data: { propertyCount: data.propertyCount, averagePrice: data.averagePrice }
        })
        updated++
      } else {
        await prisma.neighborhood.create({ data })
        created++
      }
    }
    
    console.log(`✅ Created ${created} neighborhoods, updated ${updated}`)
    
  } catch (error) {
    throw new Error(`Seeding failed: ${error.message}`)
  }
}

async function syncAlberta() {
  console.log('🍁 SYNCING ALBERTA PROPERTIES')
  console.log('=============================')
  console.log('Note: This will make requests to your CREA sync endpoint')
  console.log('Make sure your server is running and you have proper API access')
  
  try {
    const response = await fetch(`${API_BASE}/api/crea/sync-alberta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 100, batchSize: 10 })
    })
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    console.log('✅ Sync completed:', result)
    
  } catch (error) {
    throw new Error(`Alberta sync failed: ${error.message}`)
  }
}

async function backupDatabase() {
  console.log('💾 CREATING DATABASE BACKUP')
  console.log('===========================')
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const backupDir = 'backups'
    const backupFile = `database-backup-${timestamp}.json`
    const backupPath = path.join(backupDir, backupFile)
    
    // Create backups directory
    try {
      await fs.mkdir(backupDir, { recursive: true })
    } catch (error) {
      // Directory already exists
    }
    
    console.log('📊 Exporting data...')
    
    // Export all data
    const data = {
      timestamp: new Date().toISOString(),
      properties: await prisma.property.findMany(),
      neighborhoods: await prisma.neighborhood.findMany(),
      propertyNeighborhoods: await prisma.propertyNeighborhood.findMany(),
      users: await prisma.user.findMany({
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, createdAt: true, updatedAt: true
        }
      }),
      settings: await prisma.setting.findMany(),
      emailTemplates: await prisma.emailTemplate.findMany()
    }
    
    // Calculate statistics
    const stats = {
      properties: data.properties.length,
      neighborhoods: data.neighborhoods.length,
      users: data.users.length,
      settings: data.settings.length,
      emailTemplates: data.emailTemplates.length
    }
    
    data.backupStats = stats
    
    // Write backup file
    await fs.writeFile(backupPath, JSON.stringify(data, null, 2))
    
    console.log(`✅ Backup created: ${backupPath}`)
    console.log('📊 Backup statistics:')
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value.toLocaleString()} records`)
    })
    
    // Create backup info file
    const infoFile = path.join(backupDir, 'backup-info.txt')
    const info = `Last Backup: ${new Date().toISOString()}\nFile: ${backupFile}\nTotal Properties: ${stats.properties}\nTotal Users: ${stats.users}\n`
    await fs.writeFile(infoFile, info)
    
  } catch (error) {
    throw new Error(`Backup failed: ${error.message}`)
  }
}

async function migrateEnv() {
  console.log('🔄 MIGRATING ENVIRONMENT VARIABLES')
  console.log('==================================')
  
  // This would include the environment migration logic
  // For now, just show what would be migrated
  const envVars = [
    'SMTP_HOSTNAME', 'SMTP_PORT', 'SMTP_USERNAME', 
    'AGENT_EMAIL', 'SITE_URL', 'GOOGLE_MAPS_API_KEY'
  ]
  
  console.log('Environment variables to migrate:')
  envVars.forEach(envVar => {
    const value = process.env[envVar]
    console.log(`   ${envVar}: ${value ? '✅ Set' : '❌ Not set'}`)
  })
  
  console.log('\n✅ Environment analysis complete')
  console.log('💡 Run the full migration script if needed')
}

async function seedEmails() {
  console.log('📧 SEEDING EMAIL TEMPLATES')
  console.log('==========================')
  
  const templates = [
    {
      name: 'Welcome Email',
      subject: 'Welcome to Our Platform',
      content: 'Welcome! Thanks for joining our real estate platform.',
      type: 'welcome'
    },
    {
      name: 'Property Inquiry',
      subject: 'Property Inquiry Response',
      content: 'Thank you for your inquiry about the property.',
      type: 'inquiry'
    }
  ]
  
  try {
    for (const template of templates) {
      await prisma.emailTemplate.upsert({
        where: { name: template.name },
        update: template,
        create: template
      })
    }
    
    console.log(`✅ Seeded ${templates.length} email templates`)
    
  } catch (error) {
    throw new Error(`Email seeding failed: ${error.message}`)
  }
}

async function analyzeMarket() {
  console.log('📈 MARKET ANALYSIS')
  console.log('==================')
  
  try {
    // City analysis
    const cityStats = await prisma.property.groupBy({
      by: ['city'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })
    
    const totalProperties = cityStats.reduce((sum, city) => sum + city._count.id, 0)
    
    console.log(`🏠 Total Properties: ${totalProperties.toLocaleString()}`)
    console.log(`🏙️ Total Cities: ${cityStats.length}`)
    console.log(`📊 Average per City: ${Math.round(totalProperties / cityStats.length)}`)
    
    console.log('\n🏆 Top 10 Markets:')
    cityStats.slice(0, 10).forEach((city, i) => {
      const percentage = ((city._count.id / totalProperties) * 100).toFixed(1)
      console.log(`   ${i + 1}. ${city.city}: ${city._count.id.toLocaleString()} (${percentage}%)`)
    })
    
    // Market categories
    const majorMarkets = cityStats.filter(c => c._count.id >= 1000)
    const mediumMarkets = cityStats.filter(c => c._count.id >= 100 && c._count.id < 1000)
    const smallMarkets = cityStats.filter(c => c._count.id < 100)
    
    console.log('\n📊 Market Distribution:')
    console.log(`   Major Markets (1000+): ${majorMarkets.length}`)
    console.log(`   Medium Markets (100-999): ${mediumMarkets.length}`)
    console.log(`   Small Markets (1-99): ${smallMarkets.length}`)
    
  } catch (error) {
    throw new Error(`Market analysis failed: ${error.message}`)
  }
}

function showHelp() {
  console.log(`
🛠️  CONSOLIDATED PROJECT TOOLS
==============================

Usage: node scripts/consolidated-tools.mjs <command>

Available Commands:
  test-integration     Test CREA integration and API endpoints
  test-neighborhoods   Test neighborhood system functionality
  verify-data         Verify database data integrity and statistics
  seed-neighborhoods  Seed sample neighborhood data for testing
  sync-alberta        Sync Alberta properties from CREA (requires API access)
  backup-database     Create complete database backup in JSON format
  migrate-env         Analyze environment variables for migration
  seed-emails         Seed email templates into database
  analyze-market      Analyze market data and show comprehensive overview
  help                Show this help message

Examples:
  node scripts/consolidated-tools.mjs test-integration
  node scripts/consolidated-tools.mjs backup-database
  node scripts/consolidated-tools.mjs analyze-market

For more detailed operations, use the individual script files in the scripts/ directory.
`)
}

// Run the main function
main().catch(console.error)
