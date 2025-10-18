const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPhoneSearch() {
  try {
    console.log('🔍 Testing phone number search functionality...\n');

    // Test 1: Search for users with phone numbers
    console.log('Test 1: Searching for users with phone numbers...');
    const usersWithPhone = await prisma.user.findMany({
      where: {
        isAdmin: false,
        phone: { not: null }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        referralCode: true
      },
      take: 5
    });

    console.log(`Found ${usersWithPhone.length} users with phone numbers:`);
    usersWithPhone.forEach(user => {
      console.log(`- ${user.fullName || 'N/A'} (${user.email || 'N/A'}) - Phone: ${user.phone}`);
    });

    // Test 2: Test search functionality with phone number
    if (usersWithPhone.length > 0) {
      const testPhone = usersWithPhone[0].phone;
      console.log(`\nTest 2: Searching for phone number "${testPhone}"...`);
      
      const searchResults = await prisma.user.findMany({
        where: {
          isAdmin: false,
          OR: [
            { fullName: { contains: testPhone, mode: 'insensitive' } },
            { email: { contains: testPhone, mode: 'insensitive' } },
            { phone: { contains: testPhone, mode: 'insensitive' } },
            { referralCode: { contains: testPhone, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          referralCode: true
        }
      });

      console.log(`Found ${searchResults.length} users matching phone search:`);
      searchResults.forEach(user => {
        console.log(`- ${user.fullName || 'N/A'} (${user.email || 'N/A'}) - Phone: ${user.phone}`);
      });
    }

    // Test 3: Test partial phone number search
    if (usersWithPhone.length > 0) {
      const testPhone = usersWithPhone[0].phone;
      const partialPhone = testPhone.substring(0, 5); // First 5 digits
      console.log(`\nTest 3: Searching for partial phone number "${partialPhone}"...`);
      
      const partialSearchResults = await prisma.user.findMany({
        where: {
          isAdmin: false,
          OR: [
            { fullName: { contains: partialPhone, mode: 'insensitive' } },
            { email: { contains: partialPhone, mode: 'insensitive' } },
            { phone: { contains: partialPhone, mode: 'insensitive' } },
            { referralCode: { contains: partialPhone, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          referralCode: true
        }
      });

      console.log(`Found ${partialSearchResults.length} users matching partial phone search:`);
      partialSearchResults.forEach(user => {
        console.log(`- ${user.fullName || 'N/A'} (${user.email || 'N/A'}) - Phone: ${user.phone}`);
      });
    }

    // Test 4: Test with no results
    console.log('\nTest 4: Searching for non-existent phone number "9999999999"...');
    const noResults = await prisma.user.findMany({
      where: {
        isAdmin: false,
        OR: [
          { fullName: { contains: '9999999999', mode: 'insensitive' } },
          { email: { contains: '9999999999', mode: 'insensitive' } },
          { phone: { contains: '9999999999', mode: 'insensitive' } },
          { referralCode: { contains: '9999999999', mode: 'insensitive' } }
        ]
      }
    });

    console.log(`Found ${noResults.length} users (should be 0)`);

    console.log('\n✅ Phone search functionality test completed!');

  } catch (error) {
    console.error('❌ Error testing phone search:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPhoneSearch();
