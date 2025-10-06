/**
 * Simple test untuk debug update user API
 * Jalankan dengan: node test-update-user.js
 */

const testUpdateUser = async () => {
  const userId = 'test-user-id'; // Ganti dengan ID user yang ada
  
  const testData = {
    email: 'test@example.com',
    officer_name: 'Test Officer',
    vendor_name: null,
    phone_number: '081234567890',
    address: 'Test Address',
    role: 'VERIFIER',
    // password: 'newpassword123' // Uncomment untuk test update password
  };

  try {
    console.log('Testing update user API...');
    console.log('Test data:', testData);
    
    const response = await fetch(`http://localhost:3000/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Note: Dalam test ini tidak ada session, jadi akan fail di auth check
      },
      body: JSON.stringify(testData),
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Test error:', error);
  }
};

// testUpdateUser();

console.log('Test file created. Uncomment the last line to run the test.');
console.log('Note: You need to add proper authentication for real testing.');