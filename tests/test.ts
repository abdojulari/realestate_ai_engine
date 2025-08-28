import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testAuthentication() {
  console.log('Testing Authentication...')

  // Test user registration
  const testUser = {
    email: 'test@example.com',
    password: 'test123',
    firstName: 'Test',
    lastName: 'User'
  }

  try {
    const hashedPassword = await bcrypt.hash(testUser.password, 10)
    const user = await prisma.user.create({
      data: {
        ...testUser,
        password: hashedPassword
      }
    })
    console.log('✓ User registration successful')

    // Test user login
    const isValid = await bcrypt.compare(testUser.password, user.password!)
    if (isValid) {
      console.log('✓ User login successful')
    } else {
      console.error('✗ User login failed')
    }

    // Cleanup
    await prisma.user.delete({
      where: { id: user.id }
    })
  } catch (error) {
    console.error('✗ Authentication test failed:', error)
  }
}

async function testPropertyCRUD() {
  console.log('\nTesting Property CRUD...')

  try {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'agent@test.com',
        password: await bcrypt.hash('test123', 10),
        firstName: 'Test',
        lastName: 'Agent',
        role: 'agent'
      }
    })

    // Create property
    const property = await prisma.property.create({
      data: {
        title: 'Test Property',
        description: 'Test description',
        price: 450000,
        beds: 3,
        baths: 2,
        sqft: 1500,
        type: 'house',
        status: 'for_sale',
        address: '123 Test St',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T5T 5T5',
        latitude: 53.5461,
        longitude: -113.4937,
        features: ['Test Feature'],
        images: ['/test.jpg'],
        userId: user.id
      }
    })
    console.log('✓ Property creation successful')

    // Read property
    const readProperty = await prisma.property.findUnique({
      where: { id: property.id }
    })
    if (readProperty) {
      console.log('✓ Property read successful')
    }

    // Update property
    const updatedProperty = await prisma.property.update({
      where: { id: property.id },
      data: {
        price: 460000
      }
    })
    if (updatedProperty.price === 460000) {
      console.log('✓ Property update successful')
    }

    // Delete property
    await prisma.property.delete({
      where: { id: property.id }
    })
    console.log('✓ Property deletion successful')

    // Cleanup
    await prisma.user.delete({
      where: { id: user.id }
    })
  } catch (error) {
    console.error('✗ Property CRUD test failed:', error)
  }
}

async function testContentManagement() {
  console.log('\nTesting Content Management...')

  try {
    // Create content block
    const content = await prisma.contentBlock.create({
      data: {
        key: 'test.content',
        title: 'Test Content',
        content: 'Test content body',
        type: 'text'
      }
    })
    console.log('✓ Content creation successful')

    // Read content
    const readContent = await prisma.contentBlock.findUnique({
      where: { key: content.key }
    })
    if (readContent) {
      console.log('✓ Content read successful')
    }

    // Update content
    const updatedContent = await prisma.contentBlock.update({
      where: { id: content.id },
      data: {
        content: 'Updated test content'
      }
    })
    if (updatedContent.content === 'Updated test content') {
      console.log('✓ Content update successful')
    }

    // Delete content
    await prisma.contentBlock.delete({
      where: { id: content.id }
    })
    console.log('✓ Content deletion successful')
  } catch (error) {
    console.error('✗ Content management test failed:', error)
  }
}

async function testUserInteractions() {
  console.log('\nTesting User Interactions...')

  try {
    // Create test users and property
    const user = await prisma.user.create({
      data: {
        email: 'user@test.com',
        password: await bcrypt.hash('test123', 10),
        firstName: 'Test',
        lastName: 'User'
      }
    })

    const agent = await prisma.user.create({
      data: {
        email: 'agent2@test.com',
        password: await bcrypt.hash('test123', 10),
        firstName: 'Test',
        lastName: 'Agent',
        role: 'agent'
      }
    })

    const property = await prisma.property.create({
      data: {
        title: 'Test Property',
        description: 'Test description',
        price: 450000,
        beds: 3,
        baths: 2,
        sqft: 1500,
        type: 'house',
        status: 'for_sale',
        address: '123 Test St',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T5T 5T5',
        latitude: 53.5461,
        longitude: -113.4937,
        features: ['Test Feature'],
        images: ['/test.jpg'],
        userId: agent.id
      }
    })

    // Test saved search
    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        filters: {
          city: 'Edmonton',
          type: 'house'
        }
      }
    })
    console.log('✓ Saved search creation successful')

    // Test viewing request
    const viewing = await prisma.viewingRequest.create({
      data: {
        userId: user.id,
        propertyId: property.id,
        dateTime: new Date(),
        status: 'pending'
      }
    })
    console.log('✓ Viewing request creation successful')

    // Test property inquiry
    const inquiry = await prisma.propertyInquiry.create({
      data: {
        userId: user.id,
        propertyId: property.id,
        message: 'Test inquiry',
        status: 'pending'
      }
    })
    console.log('✓ Property inquiry creation successful')

    // Cleanup
    await prisma.savedSearch.delete({
      where: { id: savedSearch.id }
    })
    await prisma.viewingRequest.delete({
      where: { id: viewing.id }
    })
    await prisma.propertyInquiry.delete({
      where: { id: inquiry.id }
    })
    await prisma.property.delete({
      where: { id: property.id }
    })
    await prisma.user.delete({
      where: { id: user.id }
    })
    await prisma.user.delete({
      where: { id: agent.id }
    })
  } catch (error) {
    console.error('✗ User interactions test failed:', error)
  }
}

async function runTests() {
  console.log('Starting tests...\n')

  await testAuthentication()
  await testPropertyCRUD()
  await testContentManagement()
  await testUserInteractions()

  console.log('\nTests completed.')
  process.exit()
}

runTests()
