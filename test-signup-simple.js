/**
 * Simple test to verify signup creates session and sets cookie
 */

const TEST_API_URL = 'http://localhost:3000';

async function testSignupSession() {
  console.log('🧪 Testing Signup Session Creation\n');
  
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Test1234';
  
  console.log(`📧 Test Email: ${testEmail}`);
  console.log(`🔑 Test Password: ${testPassword}\n`);
  
  try {
    // Test signup
    console.log('1️⃣ Sending signup request...');
    const response = await fetch(`${TEST_API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        officer_name: 'Test Officer',
        email: testEmail,
        password: testPassword,
        vendor_name: `Test Vendor ${Date.now()}`,
        address: 'Test Address 123, Test City',
        phone_number: '081234567890',
        turnstile_token: 'test_token_dev',
      }),
    });
    
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Session Created: ${data.sessionCreated}`);
    console.log(`   Redirect To: ${data.redirectTo}`);
    
    // Check cookies
    const cookies = response.headers.get('set-cookie');
    console.log(`\n2️⃣ Checking cookies...`);
    if (cookies) {
      console.log(`   ✅ Cookie header present`);
      console.log(`   Cookie: ${cookies.substring(0, 100)}...`);
      
      // Parse cookie to check if it's a valid JWT-like structure
      const cookieMatch = cookies.match(/next-auth\.session-token=([^;]+)/);
      if (cookieMatch) {
        const token = cookieMatch[1];
        console.log(`   ✅ Session token found in cookie`);
        console.log(`   Token length: ${token.length}`);
        console.log(`   Token preview: ${token.substring(0, 50)}...`);
        
        // Check if it looks like a JWT (3 parts separated by dots)
        const parts = token.split('.');
        if (parts.length === 3) {
          console.log(`   ✅ Token structure looks like JWT (3 parts)`);
        } else {
          console.log(`   ❌ Token doesn't look like JWT (${parts.length} parts)`);
        }
      } else {
        console.log(`   ❌ Session token NOT found in cookie`);
      }
    } else {
      console.log(`   ❌ No cookie header in response`);
    }
    
    console.log(`\n3️⃣ Response data:`);
    console.log(JSON.stringify(data, null, 2));
    
    if (response.status === 201 && data.sessionCreated) {
      console.log(`\n✅ SUCCESS: Registration complete with session!`);
      console.log(`\nNext steps:`);
      console.log(`1. Try to access: ${TEST_API_URL}/verification-pending`);
      console.log(`2. Should NOT redirect to login`);
      console.log(`3. Check database:`);
      console.log(`   SELECT * FROM Session WHERE userId = (SELECT id FROM User WHERE email = '${testEmail}');`);
    } else {
      console.log(`\n❌ FAILED: Session not created or registration failed`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run test
testSignupSession();
