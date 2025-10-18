const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the adminService function directly
const { getUserManagementData } = require('./backend/services/adminService');

async function testLocalSearch() {
  try {
    console.log('🔍 Testing local search functionality...\n');

    // Test 1: Search for the specific phone number from the image
    console.log('Test 1: Searching for phone number "3127710763"...');
    const phoneSearchResult = await getUserManagementData(1, 20, '3127710763');
    console.log('Phone search result:');
    console.log(`- Users found: ${phoneSearchResult.users.length}`);
    console.log(`- Total items: ${phoneSearchResult.pagination.totalItems}`);
    
    if (phoneSearchResult.users.length > 0) {
      const user = phoneSearchResult.users[0];
      console.log(`- User details:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.fullName || 'N/A'}`);
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log(`  Phone: ${user.phone || 'N/A'}`);
      console.log(`  Referral Code: ${user.referralCode}`);
    }

    // Test 2: Search for partial phone number
    console.log('\nTest 2: Searching for partial phone number "31277"...');
    const partialSearchResult = await getUserManagementData(1, 20, '31277');
    console.log('Partial phone search result:');
    console.log(`- Users found: ${partialSearchResult.users.length}`);
    console.log(`- Total items: ${partialSearchResult.pagination.totalItems}`);

    // Test 3: Get all users to see what's in the database
    console.log('\nTest 3: Getting all users...');
    const allUsersResult = await getUserManagementData(1, 20, '');
    console.log('All users result:');
    console.log(`- Users found: ${allUsersResult.users.length}`);
    console.log(`- Total items: ${allUsersResult.pagination.totalItems}`);
    
    if (allUsersResult.users.length > 0) {
      console.log('All users in database:');
      allUsersResult.users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}, Name: ${user.fullName || 'N/A'}, Email: ${user.email || 'N/A'}, Phone: ${user.phone || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing local search:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLocalSearch();
