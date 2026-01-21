import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const plainPassword = 'Sweaty1234@'
  
  // Create admin user with password hashing and verification
  console.log('Hashing password...')
  const adminPassword = await bcrypt.hash(plainPassword, 10)
  
  // Verify the hash immediately
  const isValidHash = await bcrypt.compare(plainPassword, adminPassword)
  if (!isValidHash) {
    throw new Error('Password hash verification failed!')
  }
  console.log('✅ Password hash verified successfully')
  
  const admin = await prisma.user.upsert({
    where: { email: 'abdul.ojulari@exprealty.com' },
    update: {
      password: adminPassword,
      firstName: 'Abdul',
      lastName: 'Ojulari',
      role: 'admin'
    },
    create: {
      email: 'abdul.ojulari@exprealty.com',
      password: adminPassword,
      firstName: 'Abdul',
      lastName: 'Ojulari',
      role: 'admin'
    }
  })

  console.log('\n✅ Admin user created/updated successfully!')
  console.log('📧 Email: abdul.ojulari@exprealty.com')
  console.log('🔑 Password: Sweaty1234@')
  console.log(`👤 User ID: ${admin.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
