/**
 * Debug: Decode JWT token to see what's inside
 */

function base64UrlDecode(str) {
  // Add padding if needed
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf-8');
}

function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  
  return { header, payload };
}

// Get the token from test
const fs = require('fs');

try {
  // Read from cookies.txt if exists (from previous test)
  if (fs.existsSync('cookies.txt')) {
    const cookies = fs.readFileSync('cookies.txt', 'utf-8');
    const tokenMatch = cookies.match(/next-auth\.session-token\s+(\S+)/);
    
    if (tokenMatch) {
      const token = tokenMatch[1];
      console.log('🔍 Analyzing JWT Token\n');
      console.log('Token (first 100 chars):', token.substring(0, 100) + '...\n');
      
      const decoded = decodeJWT(token);
      
      console.log('📋 Header:');
      console.log(JSON.stringify(decoded.header, null, 2));
      console.log('');
      
      console.log('📋 Payload:');
      console.log(JSON.stringify(decoded.payload, null, 2));
      console.log('');
      
      // Check if it has required fields for NextAuth
      console.log('✅ Validation:');
      console.log(`   sub (user id): ${decoded.payload.sub ? '✅' : '❌'}`);
      console.log(`   sessionToken: ${decoded.payload.sessionToken ? '✅' : '❌'}`);
      console.log(`   iat (issued at): ${decoded.payload.iat ? '✅' : '❌'}`);
      console.log(`   exp (expires): ${decoded.payload.exp ? '✅' : '❌'}`);
      
      // Check expiry
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.payload.exp - now;
      console.log(`\n⏰ Token Expiry:`);
      console.log(`   Current time: ${new Date(now * 1000).toISOString()}`);
      console.log(`   Expires at: ${new Date(decoded.payload.exp * 1000).toISOString()}`);
      console.log(`   Valid for: ${Math.floor(expiresIn / 3600)} hours`);
      
      if (expiresIn <= 0) {
        console.log(`   ❌ Token is EXPIRED!`);
      } else {
        console.log(`   ✅ Token is valid`);
      }
      
    } else {
      console.log('❌ No token found in cookies.txt');
    }
  } else {
    console.log('❌ cookies.txt not found. Run test-e2e-signup.sh first.');
  }
} catch (error) {
  console.error('Error:', error.message);
}
