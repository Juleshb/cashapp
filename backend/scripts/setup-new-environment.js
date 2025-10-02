#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');
const path = require('path');

const prisma = new PrismaClient();

async function setupNewEnvironment() {
  try {
    console.log('🚀 Setting up new environment for B-Bike...\n');

    // Step 1: Reset database completely
    console.log('📋 Step 1: Resetting database...');
    await resetDatabase();
    console.log('✅ Database reset completed\n');

    // Step 2: Run migrations
    console.log('📋 Step 2: Running database migrations...');
    await runMigrations();
    console.log('✅ Migrations completed\n');

    // Step 3: Generate Prisma client
    console.log('📋 Step 3: Generating Prisma client...');
    await generatePrismaClient();
    console.log('✅ Prisma client generated\n');

    // Step 4: Seed VIP levels with bicycles
    console.log('📋 Step 4: Seeding VIP levels with bicycles...');
    await seedVipLevelsWithBicycles();
    console.log('✅ VIP levels seeded successfully\n');

    // Step 5: Seed tasks
    console.log('📋 Step 5: Seeding tasks...');
    await seedTasks();
    console.log('✅ Tasks seeded successfully\n');

    // Step 6: Create admin user
    console.log('📋 Step 6: Creating admin user...');
    await createAdminUser();
    console.log('✅ Admin user created successfully\n');

    // Step 7: Create company wallet
    console.log('📋 Step 7: Creating company wallet...');
    await createCompanyWallet();
    console.log('✅ Company wallet created successfully\n');

    console.log('🎉 New environment setup completed successfully!');
    console.log('\n📝 Your application is now ready with:');
    console.log('✅ Complete database schema');
    console.log('✅ 10 VIP levels with bicycle information');
    console.log('✅ Daily earning task system');
    console.log('✅ Admin user (admin@trinitymetro.com / admin123)');
    console.log('✅ Company wallet for transactions');
    console.log('\n🚀 You can now start the application with:');
    console.log('   npm run dev');

  } catch (error) {
    console.error('❌ Error during setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function resetDatabase() {
  try {
    // Drop all tables
    await prisma.$executeRawUnsafe(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Drop all sequences
    await prisma.$executeRawUnsafe(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Drop all types
    await prisma.$executeRawUnsafe(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
          EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    console.log('✅ All tables, sequences, and types dropped');
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    throw error;
  }
}

async function runMigrations() {
  try {
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Migrations deployed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

async function generatePrismaClient() {
  try {
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Prisma client generated successfully');
  } catch (error) {
    console.error('❌ Prisma client generation failed:', error.message);
    throw error;
  }
}

async function seedVipLevelsWithBicycles() {
  const vipLevels = [
    { 
      name: 'Starter', 
      amount: 30, 
      dailyEarning: 2,
      bicycleModel: 'City Cruiser Basic',
      bicycleColor: 'Blue',
      bicycleFeatures: 'Comfortable seat, basic gears, city tires'
    },
    { 
      name: 'Bronze', 
      amount: 180, 
      dailyEarning: 10,
      bicycleModel: 'Mountain Explorer',
      bicycleColor: 'Green',
      bicycleFeatures: 'Shock absorbers, 21-speed gears, off-road tires'
    },
    { 
      name: 'Silver', 
      amount: 400, 
      dailyEarning: 24,
      bicycleModel: 'Road Racer Pro',
      bicycleColor: 'Red',
      bicycleFeatures: 'Lightweight frame, racing gears, performance tires'
    },
    { 
      name: 'Gold', 
      amount: 1000, 
      dailyEarning: 50,
      bicycleModel: 'Electric Commuter',
      bicycleColor: 'Black',
      bicycleFeatures: 'Electric motor, battery pack, LED lights, GPS tracker'
    },
    { 
      name: 'Platinum', 
      amount: 1500, 
      dailyEarning: 65,
      bicycleModel: 'Hybrid Adventure',
      bicycleColor: 'Silver',
      bicycleFeatures: 'Electric assist, suspension, cargo rack, smartphone holder'
    },
    { 
      name: 'Diamond', 
      amount: 2000, 
      dailyEarning: 75,
      bicycleModel: 'Carbon Fiber Elite',
      bicycleColor: 'Carbon Black',
      bicycleFeatures: 'Carbon fiber frame, wireless shifting, power meter, premium components'
    },
    { 
      name: 'Elite', 
      amount: 5000, 
      dailyEarning: 200,
      bicycleModel: 'Smart E-Bike Premium',
      bicycleColor: 'Titanium',
      bicycleFeatures: 'AI navigation, solar charging, biometric sensors, premium leather seat'
    },
    { 
      name: 'Master', 
      amount: 6000, 
      dailyEarning: 250,
      bicycleModel: 'Custom Performance',
      bicycleColor: 'Custom Paint',
      bicycleFeatures: 'Handcrafted frame, premium components, custom paint job, professional fitting'
    },
    { 
      name: 'Legend', 
      amount: 12000, 
      dailyEarning: 500,
      bicycleModel: 'Luxury Touring',
      bicycleColor: 'Gold Plated',
      bicycleFeatures: 'Luxury materials, built-in entertainment, climate control, concierge service'
    },
    { 
      name: 'Supreme', 
      amount: 25000, 
      dailyEarning: 800,
      bicycleModel: 'Ultimate Dream Bike',
      bicycleColor: 'Diamond Encrusted',
      bicycleFeatures: 'Exclusive design, rare materials, lifetime warranty, personal bike concierge'
    }
  ];

  for (const vip of vipLevels) {
    await prisma.vipLevel.upsert({
      where: { name: vip.name },
      update: {
        amount: vip.amount,
        dailyEarning: vip.dailyEarning,
        bicycleModel: vip.bicycleModel,
        bicycleColor: vip.bicycleColor,
        bicycleFeatures: vip.bicycleFeatures,
        isActive: true
      },
      create: {
        name: vip.name,
        amount: vip.amount,
        dailyEarning: vip.dailyEarning,
        bicycleModel: vip.bicycleModel,
        bicycleColor: vip.bicycleColor,
        bicycleFeatures: vip.bicycleFeatures,
        isActive: true
      }
    });
    console.log(`✅ Created VIP level: ${vip.name} - ${vip.bicycleModel}`);
  }
}

async function seedTasks() {
  // Check if daily earning task already exists
  const existingTask = await prisma.task.findFirst({
    where: { type: 'DAILY_EARNING' }
  });

  const dailyEarningTask = {
    title: 'Daily Earning Session',
    description: 'Start your daily 1-hour earning session to earn based on your VIP level daily earning rate',
    type: 'DAILY_EARNING',
    reward: 0, // Reward is based on VIP level, not fixed amount
    requirements: {
      vipLevel: true,
      cooldownHours: 24
    },
    isActive: true,
    isRepeatable: true,
    cooldownHours: 24
  };

  if (existingTask) {
    // Update existing task
    await prisma.task.update({
      where: { id: existingTask.id },
      data: dailyEarningTask
    });
    console.log('✅ Daily earning task updated');
  } else {
    // Create new task
    await prisma.task.create({
      data: dailyEarningTask
    });
    console.log('✅ Daily earning task created');
  }
}

async function createAdminUser() {
  const adminEmail = 'admin@trinitymetro.com';
  const adminPassword = 'admin123';
  
  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log('⚠️ Admin user already exists, skipping creation');
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      fullName: 'System Administrator',
      isAdmin: true,
      isEmailVerified: true,
      referralCode: 'ADMIN001',
      wallet: {
        create: {
          balance: 0,
          totalDeposits: 0,
          totalEarnings: 0,
          totalReferralBonus: 0,
          dailyEarnings: 0
        }
      }
    }
  });

  console.log(`✅ Admin user created:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   User ID: ${adminUser.id}`);
}

async function createCompanyWallet() {
  // Check if company wallet already exists
  const existingWallet = await prisma.companyWallet.findFirst({
    where: { network: 'ETH' }
  });

  if (existingWallet) {
    console.log('⚠️ Company wallet already exists, skipping creation');
    return;
  }

  const companyWallet = await prisma.companyWallet.create({
    data: {
      address: '0x0000000000000000000000000000000000000000',
      network: 'ETH',
      balance: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      isActive: true
    }
  });

  console.log(`✅ Company wallet created:`);
  console.log(`   Network: ${companyWallet.network}`);
  console.log(`   Address: ${companyWallet.address}`);
  console.log(`   Balance: ${companyWallet.balance}`);
}

// Function to confirm before setup
async function confirmSetup() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  This will COMPLETELY RESET the database and set up a new environment!\nAll existing data will be lost!\nAre you absolutely sure you want to continue? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Main execution
async function main() {
  try {
    const confirmed = await confirmSetup();
    
    if (confirmed) {
      console.log('\n🚀 Proceeding with new environment setup...\n');
      await setupNewEnvironment();
    } else {
      console.log('\n❌ Setup cancelled.');
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { setupNewEnvironment };
