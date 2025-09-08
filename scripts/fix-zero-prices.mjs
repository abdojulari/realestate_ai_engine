#!/usr/bin/env node

/**
 * Fix CREA properties with price = 0
 * These should not exist according to CREA standards
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixZeroPrices() {
  console.log('🔍 Finding CREA properties with price = 0...')
  
  // Find properties with price = 0 that are from CREA source
  const zeroProperties = await prisma.property.findMany({
    where: {
      price: 0,
      source: 'crea'
    },
    select: {
      id: true,
      title: true,
      price: true,
      images: true,
      externalId: true,
      mlsNumber: true
    }
  })

  console.log(`📊 Found ${zeroProperties.length} CREA properties with price = 0`)
  
  if (zeroProperties.length === 0) {
    console.log('✅ No properties to fix!')
    return
  }

  console.log('\n🗑️ These properties will be deleted (they should not exist):')
  zeroProperties.forEach(p => {
    console.log(`   - ID: ${p.id} | ${p.title} | MLS: ${p.mlsNumber || 'N/A'}`)
  })

  // Delete these properties since they're invalid
  const deleteResult = await prisma.property.deleteMany({
    where: {
      price: 0,
      source: 'crea'
    }
  })

  console.log(`\n✅ Deleted ${deleteResult.count} invalid CREA properties`)
  console.log('🎯 CREA properties with price = 0 should not exist - they have been removed')
}

async function main() {
  try {
    await fixZeroPrices()
  } catch (error) {
    console.error('❌ Error fixing zero prices:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
