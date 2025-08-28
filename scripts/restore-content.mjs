import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function restoreContent() {
  console.log('Restoring Why Choose Us content...')
  
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

  await prisma.$disconnect()
  console.log('Content restoration completed!')
}

restoreContent().catch(console.error)
