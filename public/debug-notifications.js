/**
 * Debug helper untuk testing notification types dan handling
 * 
 * Jalankan di browser console untuk debug notification issues
 */

function debugNotificationHandling() {
  console.log('🧪 Debug Notification Handling Logic\n');
  
  // Sample notifications for testing
  const testNotifications = [
    {
      id: 'test-1',
      type: 'system_info',
      title: 'Sistem Notification 1',
      message: 'Pesan sistem untuk admin',
      data: '{"info": "test-1"}'
    },
    {
      id: 'test-2', 
      type: 'submission_approved',
      title: 'Pengajuan Disetujui',
      message: 'Pengajuan Anda telah disetujui',
      data: '{"submissionId": "sub-123"}'
    },
    {
      id: 'test-3',
      type: 'new_vendor',
      title: 'Vendor Baru',
      message: 'Vendor baru mendaftar dan perlu verifikasi',
      data: '{"vendorId": "vendor-456"}'
    },
    {
      id: 'test-4',
      type: 'user_registered',
      title: 'User Baru Terdaftar',
      message: 'User baru terdaftar dan perlu verifikasi',
      data: '{"userId": "user-789"}'
    }
  ];

  // Test logic functions (copy from page.tsx)
  const submissionTypes = ['submission_approved','submission_rejected','submission_pending','new_submission','status_change'];
  const vendorTypes = ['user_registered', 'new_vendor', 'new_user_verification', 'vendor_verified', 'vendor_registered'];

  const hasSubmissionData = (notification) => {
    if (submissionTypes.includes(notification.type)) return true;
    
    if (notification.data) {
      try {
        const parsed = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
        if (parsed?.submissionId || parsed?.submission_id) return true;
      } catch {
        if (typeof notification.data === 'string' && notification.data.includes('submissionId')) return true;
      }
    }
    
    const text = `${notification.title} ${notification.message}`.toLowerCase();
    return ['pengajuan', 'submission', 'simlok'].some(k => text.includes(k));
  };

  const hasVendorData = (notification) => {
    if (vendorTypes.includes(notification.type)) return true;
    
    if (notification.data) {
      try {
        const parsed = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
        if (parsed?.vendorId || parsed?.userId) return true;
      } catch {
        if (typeof notification.data === 'string' && notification.data.includes('vendorId')) return true;
      }
    }
    
    const text = `${notification.title} ${notification.message}`.toLowerCase();
    return ['pendaftaran vendor', 'vendor baru mendaftar', 'verifikasi vendor'].some(k => text.includes(k));
  };

  // Test each notification
  testNotifications.forEach((notif, index) => {
    const isSubmission = hasSubmissionData(notif);
    const isVendor = hasVendorData(notif);
    
    console.log(`${index + 1}. ${notif.type} - "${notif.title}"`);
    console.log(`   📋 hasSubmissionData: ${isSubmission}`);
    console.log(`   👥 hasVendorData: ${isVendor}`);
    console.log(`   🎯 Expected handling: ${
      isVendor ? 'Vendor (show info message)' : 
      isSubmission ? 'Submission (open modal)' : 
      'General (show info message)'
    }`);
    console.log('');
  });

  console.log('✅ Debug completed. Check results above.');
}

// Test dengan data notification sebenarnya jika tersedia
function testRealNotifications() {
  console.log('🔍 Testing Real Notifications\n');
  
  // Cek apakah ada data notifications di window/state
  const notifications = window.notifications || [];
  
  if (notifications.length === 0) {
    console.log('❌ No notifications found in window.notifications');
    console.log('💡 Try running this on the notifications page with data loaded');
    return;
  }

  console.log(`📊 Found ${notifications.length} notifications\n`);
  
  notifications.slice(0, 5).forEach((notif, index) => {
    console.log(`${index + 1}. ${notif.type} - "${notif.title}"`);
    console.log(`   Data: ${JSON.stringify(notif.data)}`);
    console.log(`   Message: ${notif.message.substring(0, 50)}...`);
    console.log('');
  });
}

// Expose functions
window.debugNotificationHandling = debugNotificationHandling;
window.testRealNotifications = testRealNotifications;

console.log('🛠️ Notification Debug Tools Loaded');
console.log('📞 Available functions:');
console.log('   - debugNotificationHandling()');
console.log('   - testRealNotifications()');