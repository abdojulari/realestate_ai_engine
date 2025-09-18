#!/usr/bin/env node

/**
 * Consolidated Admin Tools for abdul Real Estate
 * 
 * This script combines the most useful database management and maintenance functions.
 * Run with: node scripts/admin-tools.mjs [command]
 * 
 * Available commands:
 * - query-users          : Display all users with detailed information
 * - check-properties     : Show property statistics and sample data
 * - check-content        : Display all content blocks
 * - fix-zero-prices      : Remove CREA properties with invalid zero prices
 * - test-crea-api        : Test CREA API connectivity and data
 * - restore-content      : Restore default content (why-choose-us, testimonials)
 * - seed-about          : Seed about page content
 * - seed-hero           : Seed hero section content
 * - update-about        : Update about page with Abdul's content
 * - help                : Show this help message
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

// =============================================================================
// USER MANAGEMENT
// =============================================================================

async function queryUsers() {
  try {
    console.log('🔍 Querying users from database...\n')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        provider: true,
        marketingConsent: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            properties: true,
            savedSearches: true,
            viewingRequests: true,
            inquiries: true,
            savedProperties: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    if (users.length === 0) {
      console.log('❌ No users found in the database.')
      return
    }

    console.log(`📊 Found ${users.length} users:\n`)
    
    // Group users by role
    const usersByRole = users.reduce((acc, user) => {
      if (!acc[user.role]) {
        acc[user.role] = []
      }
      acc[user.role].push(user)
      return acc
    }, {})

    // Display users grouped by role
    Object.entries(usersByRole).forEach(([role, roleUsers]) => {
      console.log(`👥 ${role.toUpperCase()} USERS (${roleUsers.length}):`)
      console.log('─'.repeat(60))
      
      roleUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`)
        console.log(`   📧 Email: ${user.email}`)
        console.log(`   🆔 ID: ${user.id}`)
        console.log(`   📱 Phone: ${user.phone || 'Not provided'}`)
        console.log(`   🔐 Provider: ${user.provider || 'Email/Password'}`)
        console.log(`   📅 Created: ${new Date(user.createdAt).toLocaleDateString()}`)
        console.log(`   📈 Activity:`)
        console.log(`      • Properties: ${user._count.properties}`)
        console.log(`      • Saved Searches: ${user._count.savedSearches}`)
        console.log(`      • Viewing Requests: ${user._count.viewingRequests}`)
        console.log(`      • Inquiries: ${user._count.inquiries}`)
        console.log(`      • Saved Properties: ${user._count.savedProperties}`)
        console.log('')
      })
      console.log('')
    })

    // Summary statistics
    console.log('📈 SUMMARY:')
    console.log('─'.repeat(30))
    Object.entries(usersByRole).forEach(([role, roleUsers]) => {
      console.log(`${role}: ${roleUsers.length} users`)
    })
    console.log(`Total: ${users.length} users`)

  } catch (error) {
    console.error('❌ Error querying users:', error)
  }
}

// =============================================================================
// PROPERTY MANAGEMENT
// =============================================================================

async function checkProperties() {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      title: true,
      city: true,
      latitude: true,
      longitude: true,
      price: true,
      type: true,
      source: true
    },
    orderBy: { id: 'asc' }
  })

  console.log(`Found ${properties.length} properties:`)
  console.log('ID | Title | City | Price | Type | Source')
  console.log('---|-------|------|-------|------|-------')
  
  properties.slice(0, 10).forEach(p => {
    const title = p.title.length > 25 ? p.title.substring(0, 25) + '...' : p.title
    console.log(`${p.id} | ${title} | ${p.city} | $${p.price.toLocaleString()} | ${p.type} | ${p.source || 'manual'}`)
  })

  if (properties.length > 10) {
    console.log(`... and ${properties.length - 10} more properties`)
  }

  const users = await prisma.user.count()
  const contentBlocks = await prisma.contentBlock.count()
  
  // Property statistics by source
  const propertiesBySource = properties.reduce((acc, p) => {
    const source = p.source || 'manual'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {})
  
  console.log(`\nSummary:`)
  console.log(`- Total Properties: ${properties.length}`)
  Object.entries(propertiesBySource).forEach(([source, count]) => {
    console.log(`  - ${source}: ${count}`)
  })
  console.log(`- Users: ${users}`)
  console.log(`- Content Blocks: ${contentBlocks}`)
}

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

// =============================================================================
// CONTENT MANAGEMENT
// =============================================================================

async function checkContent() {
  const content = await prisma.contentBlock.findMany({
    select: {
      key: true,
      title: true,
      metadata: true
    },
    orderBy: { key: 'asc' }
  })

  console.log('Content blocks in database:')
  content.forEach(block => {
    const section = block.metadata?.section || 'unknown'
    console.log(`- ${block.key}: "${block.title}" (${section})`)
  })

  const whyChooseUs = content.filter(b => b.key.includes('why-choose-us'))
  const testimonials = content.filter(b => b.key.includes('testimonial'))
  
  console.log(`\nSummary:`)
  console.log(`- Why Choose Us items: ${whyChooseUs.length}`)
  console.log(`- Testimonials: ${testimonials.length}`)
  console.log(`- Total content blocks: ${content.length}`)
}

async function restoreContent() {
  console.log('Restoring Why Choose Us content and testimonials...')
  
  // Why Choose Us section title
  const whyChooseUsTitle = {
    key: 'why-choose-us',
    title: 'Why Choose Us',
    content: 'Why Choose Us',
    type: 'text',
    metadata: {
      section: 'home',
      published: true
    }
  }

  // Why Choose Us items
  const whyChooseUsItems = [
    {
      key: 'why-choose-us-item',
      title: 'First-Time Buyer Guide',
      content: 'Buying your first home in Edmonton? This guide walks you through every step — from mortgage pre-approval to move-in day. Clear, simple, and tailored for new buyers, so you can avoid surprises and make smart decisions. Start your journey with confidence.',
      type: 'text',
      metadata: {
        section: 'home',
        published: true,
        icon: 'mdi-home-search'
      }
    },
    {
      key: 'why-choose-us-item-2',
      title: 'Edmonton Market Insights',
      content: 'Stay informed with up-to-date stats and expert analysis on the Edmonton real estate market. Whether you\'re buying, selling, or just watching, these insights help you time your move and understand trends. Updated monthly and written in plain language.',
      type: 'text',
      metadata: {
        section: 'home',
        published: true,
        icon: 'mdi-chart-line'
      }
    },
    {
      key: 'why-choose-us-item-3',
      title: 'Browse Homes by Neighborhood',
      content: 'Explore homes in top Edmonton neighborhoods like Windermere, Mill Woods, and Downtown. Each area comes with listings, school info, amenities, and lifestyle tips so you can find the right fit. Start searching by location and discover your ideal community.',
      type: 'text',
      metadata: {
        section: 'home',
        published: true,
        icon: 'mdi-map-marker-radius'
      }
    },
    {
      key: 'why-choose-us-item-4',
      title: 'Book a Free Consultation',
      content: 'Got questions? Book a free 15-minute call to talk about your home goals. No pressure, no pitch — just helpful advice tailored to your situation. Whether you\'re planning to buy, sell, or explore, I\'m here to guide you step by step.',
      type: 'text',
      metadata: {
        section: 'home',
        published: true,
        icon: 'mdi-phone-in-talk'
      }
    }
  ]

  // Testimonials
  const testimonials = [
    {
      key: 'testimonial-1',
      title: 'Sarah Johnson',
      content: 'Working with this team made buying our first home so much easier. They guided us through every step and helped us find the perfect place in Windermere. Highly recommended!',
      type: 'testimonial',
      metadata: {
        section: 'testimonials',
        published: true,
        position: 'Windermere Resident',
        avatar: '/images/avatars/sarah.jpg'
      }
    },
    {
      key: 'testimonial-2',
      title: 'Michael Chen',
      content: 'Sold our house in Mill Woods in just 2 weeks! The marketing strategy was excellent and the communication throughout the process was outstanding. Professional service from start to finish.',
      type: 'testimonial',
      metadata: {
        section: 'testimonials',
        published: true,
        position: 'Mill Woods Seller',
        avatar: '/images/avatars/michael.jpg'
      }
    },
    {
      key: 'testimonial-3',
      title: 'Emily Rodriguez',
      content: 'As a first-time buyer, I was nervous about the process. The team made everything clear and stress-free. They found me a beautiful condo in Oliver that fits my budget perfectly!',
      type: 'testimonial',
      metadata: {
        section: 'testimonials',
        published: true,
        position: 'Oliver Resident',
        avatar: '/images/avatars/emily.jpg'
      }
    }
  ]

  // Combine all content
  const allContent = [whyChooseUsTitle, ...whyChooseUsItems, ...testimonials]

  // Insert/update each content block
  for (const item of allContent) {
    try {
      await prisma.contentBlock.upsert({
        where: { key: item.key },
        update: {
          title: item.title,
          content: item.content,
          type: item.type,
          metadata: item.metadata
        },
        create: item
      })
      console.log(`✓ Restored: ${item.key}`)
    } catch (error) {
      console.error(`✗ Error restoring ${item.key}:`, error.message)
    }
  }

  console.log('Content restoration completed!')
}

async function seedAbout() {
  const items = [
    {
      key: 'about-title',
      title: 'About Title',
      content: 'About Us',
      type: 'text',
      metadata: { section: 'about', published: true }
    },
    {
      key: 'about-body',
      title: 'About Body',
      content: '<p>We help buyers and sellers across Edmonton with data-driven market insights, neighbourhood expertise, and personalized service. Whether you are purchasing your first home or selling a property, our team will guide you from consultation to closing with transparency and care.</p>',
      type: 'html',
      metadata: { section: 'about', published: true }
    }
  ]

  for (const item of items) {
    await prisma.contentBlock.upsert({
      where: { key: item.key },
      update: { title: item.title, content: item.content, type: item.type, metadata: item.metadata },
      create: item
    })
  }

  console.log('Seeded About content.')
}

async function seedHero() {
  const items = [
    {
      key: 'hero-title',
      title: 'Hero Title',
      content: 'Find Your Dream Home',
      type: 'text',
      metadata: { section: 'home', published: true }
    },
    {
      key: 'hero-subtitle',
      title: 'Hero Subtitle',
      content: 'Search properties for sale and to rent in your area',
      type: 'text',
      metadata: { section: 'home', published: true }
    }
  ]

  for (const item of items) {
    await prisma.contentBlock.upsert({
      where: { key: item.key },
      update: { title: item.title, content: item.content, type: item.type, metadata: item.metadata },
      create: item
    })
  }

  console.log('Seeded hero title and subtitle.')
}

async function updateAbout() {
  const newAboutContent = `
<div class="v-container py-12">
  <div class="v-row justify-center">
    <div class="v-col cols-12 md-8">
      <div class="v-card elevation-2 pa-6">
        <h2 class="text-h5 font-weight-bold text-primary mb-4">
          About Me
        </h2>

        <div class="v-divider my-4"></div>

        <h3 class="text-subtitle-1 font-weight-medium mb-4">
          Abdul Ojulari – Residential Real Estate Agent | Licensed REALTOR®
        </h3>

        <div class="text-body-1">
          <p>
            Welcome! I'm Abdul Ojulari, a dedicated residential real estate professional committed to helping individuals and families navigate one of life's most important decisions: buying or selling a home.
          </p>

          <p>
            With a passion for real estate and a deep understanding of the local market, I bring a client-first approach to every transaction. Whether you're a first-time buyer, a growing family looking to upsize, or an investor seeking the perfect opportunity, my goal is to provide personalized guidance, clear communication, and reliable support from start to finish.
          </p>

          <p>
            As a licensed REALTOR®, I adhere to a strict code of ethics and maintain the highest standards of professionalism. I believe that every client deserves honesty, integrity, and the peace of mind that comes from working with someone who truly has their best interests at heart.
          </p>

          <div class="v-divider my-6"></div>

          <h3 class="text-h6 font-weight-bold mb-4">
            What I Offer:
          </h3>

          <ul class="mb-4">
            <li class="mb-2">
              <strong>Market Expertise:</strong> In-depth knowledge of local neighborhoods, trends, and property values.
            </li>
            <li class="mb-2">
              <strong>Client-Focused Service:</strong> I listen carefully to your needs and tailor my approach to meet your unique goals.
            </li>
            <li class="mb-2">
              <strong>Strong Negotiation Skills:</strong> I advocate fiercely for my clients to ensure the best possible outcomes.
            </li>
            <li class="mb-2">
              <strong>Reliable Communication:</strong> Expect timely updates and straightforward advice—no surprises.
            </li>
          </ul>

          <p class="mt-6">
            My mission is simple: to make your real estate experience smooth, successful, and even enjoyable. Whether you're buying your dream home or selling a cherished property, I'm here to guide you with professionalism, transparency, and care.
          </p>

          <p class="font-weight-medium mt-6">
            Let's make your real estate goals a reality.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
  `.trim()

  try {
    console.log('🔄 Updating About Page Content...\n')
    
    // Update the existing about-body content block
    const updated = await prisma.contentBlock.update({
      where: { key: 'about-body' },
      data: {
        title: 'About Abdul Ojulari',
        content: newAboutContent,
        type: 'html',
        metadata: {
          section: 'about',
          published: true
        }
      }
    })
    
    console.log('✅ Successfully updated about-body content block')
    
    // Update the title as well
    await prisma.contentBlock.update({
      where: { key: 'about-title' },
      data: {
        content: 'About Abdul Ojulari',
        metadata: {
          section: 'about',
          published: true
        }
      }
    })
    
    console.log('✅ Successfully updated about title')
    console.log('\n🎉 About page content has been updated!')
    
  } catch (error) {
    console.error('❌ Error updating about content:', error)
  }
}

// =============================================================================
// CREA API TESTING
// =============================================================================

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

    // Test a small sample of properties
    console.log('🔍 Testing CREA property data...')
    const sampleQuery = `$filter=StateOrProvince eq 'Alberta'&$top=10&$orderby=ListingKey desc`
    
    const sampleResponse = await fetch(`https://ddfapi.realtor.ca/odata/v1/Property?${sampleQuery}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    if (!sampleResponse.ok) {
      throw new Error(`CREA API request failed: ${sampleResponse.status}`)
    }

    const sampleData = await sampleResponse.json()
    const properties = sampleData.value || []
    
    console.log(`✅ Successfully retrieved ${properties.length} sample properties`)
    
    if (properties.length > 0) {
      const sample = properties[0]
      console.log(`📋 Sample property:`)
      console.log(`   Address: ${sample.UnparsedAddress}`)
      console.log(`   Price: $${sample.ListPrice?.toLocaleString() || 'N/A'}`)
      console.log(`   Type: ${sample.PropertyType}`)
      console.log(`   Listing Key: ${sample.ListingKey}`)
    }
    
    console.log('🎉 CREA API test completed successfully!')

  } catch (error) {
    console.error('❌ CREA API test failed:', error.message)
  }
}

// =============================================================================
// COMMAND HANDLER
// =============================================================================

function showHelp() {
  console.log(`
🛠️  abdul Real Estate Admin Tools

Available commands:
  query-users          Display all users with detailed information
  check-properties     Show property statistics and sample data
  check-content        Display all content blocks
  fix-zero-prices      Remove CREA properties with invalid zero prices
  test-crea-api        Test CREA API connectivity and data
  restore-content      Restore default content (why-choose-us, testimonials)
  seed-about          Seed about page content
  seed-hero           Seed hero section content
  update-about        Update about page with Abdul's content
  help                Show this help message

Usage:
  node scripts/admin-tools.mjs [command]

Examples:
  node scripts/admin-tools.mjs query-users
  node scripts/admin-tools.mjs check-properties
  node scripts/admin-tools.mjs restore-content
`)
}

async function main() {
  const command = process.argv[2]

  if (!command || command === 'help') {
    showHelp()
    return
  }

  try {
    console.log(`🚀 Running command: ${command}\n`)

    switch (command) {
      case 'query-users':
        await queryUsers()
        break
      case 'check-properties':
        await checkProperties()
        break
      case 'check-content':
        await checkContent()
        break
      case 'fix-zero-prices':
        await fixZeroPrices()
        break
      case 'test-crea-api':
        await testCreaApi()
        break
      case 'restore-content':
        await restoreContent()
        break
      case 'seed-about':
        await seedAbout()
        break
      case 'seed-hero':
        await seedHero()
        break
      case 'update-about':
        await updateAbout()
        break
      default:
        console.error(`❌ Unknown command: ${command}`)
        console.log('Run "node scripts/admin-tools.mjs help" to see available commands')
        process.exit(1)
    }

    console.log('\n✅ Command completed successfully!')

  } catch (error) {
    console.error('❌ Command failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the main function
main()
