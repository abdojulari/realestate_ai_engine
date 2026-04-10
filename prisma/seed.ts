import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'abdulkabirojulari@gmail.com'
  const plainPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'Sweaty1234@'

  // Create super admin user with password hashing and verification
  console.log('Hashing password...')
  const adminPassword = await bcrypt.hash(plainPassword, 10)

  // Verify the hash immediately
  const isValidHash = await bcrypt.compare(plainPassword, adminPassword)
  if (!isValidHash) {
    throw new Error('Password hash verification failed!')
  }
  console.log('✅ Password hash verified successfully')

  // Create or update Super Admin
  // Super Admin has full access without requiring a subscription
  // All users associated with Super Admin also inherit full access
  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: adminPassword,
      firstName: 'Abdul',
      lastName: 'Ojulari',
      role: 'super_admin', // Super Admin role - full access, no subscription needed
      subscriptionTier: null, // Super Admin doesn't need a subscription tier
    },
    create: {
      email: adminEmail,
      password: adminPassword,
      firstName: 'Abdul',
      lastName: 'Ojulari',
      role: 'super_admin', // Super Admin role - full access, no subscription needed
      subscriptionTier: null,
    },
  })

  console.log('\n✅ Super Admin user created/updated successfully!')
  console.log(`📧 Email: ${adminEmail}`)
  if (process.env.SUPER_ADMIN_PASSWORD) {
    console.log('🔑 Password: from SUPER_ADMIN_PASSWORD (not printed)')
  } else {
    console.log('🔑 Password: default Sweaty1234@ (override with SUPER_ADMIN_PASSWORD)')
  }
  console.log(`👤 User ID: ${superAdmin.id}`)
  console.log('🔓 Role: super_admin (Full access to all features)')
  console.log('\n📝 Note: Users associated with this Super Admin will also have full feature access.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
