import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    }
  })

  // Create agent user
  const agentPassword = await bcrypt.hash('agent123', 10)
  const agent = await prisma.user.upsert({
    where: { email: 'agent@example.com' },
    update: {},
    create: {
      email: 'agent@example.com',
      password: agentPassword,
      firstName: 'Agent',
      lastName: 'User',
      role: 'agent',
      phone: '780-123-4567'
    }
  })

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      firstName: 'Regular',
      lastName: 'User',
      role: 'user'
    }
  })

  // Create sample properties with varied Edmonton locations
  const properties = await Promise.all([
    // Downtown Edmonton
    prisma.property.create({
      data: {
        title: 'Luxury Downtown Penthouse',
        description: 'Stunning penthouse with panoramic city views in the heart of downtown Edmonton',
        price: 850000,
        beds: 3,
        baths: 3,
        sqft: 2200,
        type: 'condo',
        status: 'for_sale',
        address: '10180 103 Street NW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T5J 0X5',
        latitude: 53.5444,
        longitude: -113.4909,
        features: ['Concierge', 'Gym', 'Pool', 'Parking', 'Balcony'],
        images: ['/images/properties/property1.jpg', '/images/properties/property1-2.jpg', '/images/properties/property1-3.jpg'],
        userId: agent.id
      }
    }),
    
    // Oliver District
    prisma.property.create({
      data: {
        title: 'Modern Oliver Condo',
        description: 'Contemporary condo in trendy Oliver district with river valley access',
        price: 425000,
        beds: 2,
        baths: 2,
        sqft: 1100,
        type: 'condo',
        status: 'for_sale',
        address: '11203 103A Avenue NW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T5K 0S7',
        latitude: 53.5394,
        longitude: -113.5089,
        features: ['Parking', 'Gym', 'In-suite Laundry'],
        images: ['/images/properties/property2.jpg', '/images/properties/property2-2.jpg', '/images/properties/property2-3.jpg'],
        userId: agent.id
      }
    }),

    // Windermere
    prisma.property.create({
      data: {
        title: 'Windermere Executive Home',
        description: 'Stunning executive home in prestigious Windermere with lake access',
        price: 1250000,
        beds: 5,
        baths: 4,
        sqft: 3800,
        type: 'house',
        status: 'for_sale',
        address: '1234 Windermere Way SW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T6W 2J5',
        latitude: 53.4203,
        longitude: -113.6089,
        features: ['Triple Garage', 'Lake Access', 'Gourmet Kitchen', 'Wine Cellar', 'Home Theater'],
        images: ['/images/properties/property3.jpg', '/images/properties/property3-2.jpg', '/images/properties/property3-3.jpg'],
        userId: agent.id
      }
    }),

    // Mill Woods
    prisma.property.create({
      data: {
        title: 'Mill Woods Family Home',
        description: 'Perfect family home in established Mill Woods neighborhood',
        price: 485000,
        beds: 4,
        baths: 3,
        sqft: 2100,
        type: 'house',
        status: 'for_sale',
        address: '2345 Mill Woods Road E',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T6L 4P9',
        latitude: 53.4567,
        longitude: -113.3456,
        features: ['Double Garage', 'Finished Basement', 'Large Backyard', 'Fireplace'],
        images: ['/images/properties/property4.jpg', '/images/properties/property4-2.jpg', '/images/properties/property4-3.jpg'],
        userId: agent.id
      }
    }),

    // Strathcona
    prisma.property.create({
      data: {
        title: 'Historic Strathcona Character Home',
        description: 'Beautifully restored heritage home in vibrant Old Strathcona',
        price: 675000,
        beds: 3,
        baths: 2,
        sqft: 1850,
        type: 'house',
        status: 'for_sale',
        address: '8234 104 Street NW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T6E 4E6',
        latitude: 53.5167,
        longitude: -113.5089,
        features: ['Original Hardwood', 'Heritage Details', 'Updated Kitchen', 'Garden'],
        images: ['/images/properties/property5.jpg', '/images/properties/property5-2.jpg', '/images/properties/property5-3.jpg'],
        userId: agent.id
      }
    }),

    // Glenora
    prisma.property.create({
      data: {
        title: 'Glenora Luxury Estate',
        description: 'Magnificent estate home in exclusive Glenora with river valley views',
        price: 1850000,
        beds: 6,
        baths: 5,
        sqft: 4500,
        type: 'house',
        status: 'for_sale',
        address: '12345 Glenora Crescent NW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T5N 3A1',
        latitude: 53.5456,
        longitude: -113.5234,
        features: ['River Valley Views', 'Chef Kitchen', 'Wine Cellar', 'Pool', 'Guest Suite'],
        images: ['/images/properties/property6.jpg', '/images/properties/property6-2.jpg', '/images/properties/property6-3.jpg'],
        userId: agent.id
      }
    }),

    // Sherwood Park (Adjacent)
    prisma.property.create({
      data: {
        title: 'Sherwood Park Bungalow',
        description: 'Immaculate bungalow in family-friendly Sherwood Park',
        price: 525000,
        beds: 3,
        baths: 2,
        sqft: 1650,
        type: 'house',
        status: 'for_sale',
        address: '123 Sherwood Drive',
        city: 'Sherwood Park',
        province: 'AB',
        postalCode: 'T8A 3M7',
        latitude: 53.5167,
        longitude: -113.3089,
        features: ['Attached Garage', 'Finished Basement', 'Deck', 'Close to Schools'],
        images: ['/images/properties/property7.jpg', '/images/properties/property7-2.jpg', '/images/properties/property7-3.jpg'],
        userId: agent.id
      }
    }),

    // Riverbend
    prisma.property.create({
      data: {
        title: 'Riverbend Townhouse',
        description: 'Modern townhouse with river access in desirable Riverbend',
        price: 395000,
        beds: 3,
        baths: 2,
        sqft: 1450,
        type: 'townhouse',
        status: 'for_sale',
        address: '456 Riverbend Square NW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T6R 2E3',
        latitude: 53.4789,
        longitude: -113.4567,
        features: ['River Access', 'Attached Garage', 'Patio', 'Modern Finishes'],
        images: ['/images/properties/property8.jpg', '/images/properties/property8-2.jpg', '/images/properties/property8-3.jpg'],
        userId: agent.id
      }
    }),

    // Terwillegar
    prisma.property.create({
      data: {
        title: 'Terwillegar Heights New Build',
        description: 'Brand new construction in sought-after Terwillegar Heights',
        price: 725000,
        beds: 4,
        baths: 3,
        sqft: 2650,
        type: 'house',
        status: 'for_sale',
        address: '789 Terwillegar Drive NW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T6R 3M8',
        latitude: 53.4234,
        longitude: -113.5678,
        features: ['New Construction', 'Triple Garage', 'Open Concept', 'Smart Home Features'],
        images: ['/images/properties/property9.jpg', '/images/properties/property9-2.jpg', '/images/properties/property9-3.jpg'],
        userId: agent.id
      }
    }),

    // Westmount
    prisma.property.create({
      data: {
        title: 'Westmount Starter Home',
        description: 'Charming starter home in established Westmount neighborhood',
        price: 365000,
        beds: 2,
        baths: 1,
        sqft: 950,
        type: 'house',
        status: 'for_sale',
        address: '321 Westmount Road NW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T5L 4N2',
        latitude: 53.5234,
        longitude: -113.4234,
        features: ['Hardwood Floors', 'Updated Kitchen', 'Fenced Yard', 'Close to Transit'],
        images: ['/images/properties/property10.jpg', '/images/properties/property10-2.jpg', '/images/properties/property10-3.jpg'],
        userId: agent.id
      }
    }),

    // Capilano
    prisma.property.create({
      data: {
        title: 'Capilano Duplex Investment',
        description: 'Excellent duplex investment opportunity in mature Capilano',
        price: 545000,
        beds: 4,
        baths: 3,
        sqft: 2200,
        type: 'duplex',
        status: 'for_sale',
        address: '654 Capilano Crescent NW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T5E 5H8',
        latitude: 53.5678,
        longitude: -113.4789,
        features: ['Investment Property', 'Separate Entrances', 'Parking', 'River Valley Access'],
        images: ['/images/properties/property11.jpg', '/images/properties/property11-2.jpg', '/images/properties/property11-3.jpg'],
        userId: agent.id
      }
    }),

    // Garneau
    prisma.property.create({
      data: {
        title: 'Garneau Student Rental',
        description: 'Prime student rental property near University of Alberta',
        price: 425000,
        beds: 5,
        baths: 2,
        sqft: 1800,
        type: 'house',
        status: 'for_sale',
        address: '987 Garneau Street NW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T6G 2J2',
        latitude: 53.5189,
        longitude: -113.5234,
        features: ['Near University', 'Rental Income', 'Updated Electrical', 'Parking'],
        images: ['/images/properties/property12.jpg', '/images/properties/property12-2.jpg', '/images/properties/property12-3.jpg'],
        userId: agent.id
      }
    })
  ])

  // Create sample content blocks
  await Promise.all([
    prisma.contentBlock.create({
      data: {
        key: 'home.hero.title',
        title: 'Hero Title',
        content: 'Find Your Dream Home',
        type: 'text'
      }
    }),
    prisma.contentBlock.create({
      data: {
        key: 'home.hero.subtitle',
        title: 'Hero Subtitle',
        content: 'Search properties for sale and to rent in your area',
        type: 'text'
      }
    }),
    prisma.contentBlock.create({
      data: {
        key: 'about.content',
        title: 'About Us Content',
        content: 'We are your trusted real estate partner...',
        type: 'html'
      }
    })
  ])

  // Create sample saved searches
  await prisma.savedSearch.create({
    data: {
      userId: user.id,
      filters: {
        city: 'Edmonton',
        propertyType: 'house',
        minPrice: 300000,
        maxPrice: 600000,
        beds: 3,
        baths: 2
      }
    }
  })

  // Create sample viewing requests
  await prisma.viewingRequest.create({
    data: {
      userId: user.id,
      propertyId: properties[0].id,
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'pending',
      notes: 'Interested in similar properties in the area'
    }
  })

  // Create sample property inquiries
  await prisma.propertyInquiry.create({
    data: {
      userId: user.id,
      propertyId: properties[0].id,
      message: 'I am interested in scheduling a viewing.',
      status: 'pending'
    }
  })

  // Create sample property views
  await prisma.propertyView.create({
    data: {
      propertyId: properties[0].id,
      userId: user.id,
      ipAddress: '127.0.0.1'
    }
  })

  // Create default settings
  await Promise.all([
    prisma.setting.create({
      data: {
        key: 'site.name',
        value: 'Real Estate Portal'
      }
    }),
    prisma.setting.create({
      data: {
        key: 'site.email',
        value: 'support@example.com'
      }
    })
  ])

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
