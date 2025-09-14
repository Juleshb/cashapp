const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        isAdmin: true
      }
    });

    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Name: ${existingAdmin.fullName}`);
      console.log('You can use these credentials to login to the admin panel.');
      return;
    }

    // Generate referral code
    const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        fullName: 'Admin User',
        email: 'admin@trinitymetro.com',
        password: await bcrypt.hash('admin123', 12),
        isEmailVerified: true,
        isActive: true,
        isAdmin: true,
        referralCode: referralCode
      }
    });

    // Create wallet for admin
    await prisma.wallet.create({
      data: {
        userId: adminUser.id
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@trinitymetro.com');
    console.log('🔑 Password: admin123');
    console.log('🔗 Referral Code:', referralCode);
    console.log('');
    console.log('⚠️  IMPORTANT: Change these credentials after first login!');
    console.log('🌐 Admin Panel URL: https://www.tmb8080.online/admin');
    console.log('📱 You can also access admin features through the API endpoints');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
