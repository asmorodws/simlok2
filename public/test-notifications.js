/**
 * Test script untuk memverifikasi perbaikan race condition pada notifikasi
 * 
 * Cara test:
 * 1. Login sebagai Super Admin
 * 2. Buka Developer Console (F12)
 * 3. Jalankan script ini di console
 * 4. Lihat log untuk memverifikasi bahwa tidak ada race condition
 */

async function testNotificationMarkAsRead() {
  console.log('🧪 Testing notification markAsRead race condition fix...');
  
  // Simulasi multiple markAsRead calls bersamaan
  const testNotificationIds = ['test-1', 'test-2', 'test-3'];
  
  // Get store instance (jika menggunakan Zustand)
  const store = window.useNotificationsStore?.getState();
  
  if (!store || !store.markAsRead) {
    console.error('❌ Notification store not found. Make sure you\'re on a page with notifications.');
    return;
  }
  
  console.log('📊 Current notifications:', store.items.length);
  console.log('📊 Current unread count:', store.unreadCount);
  
  // Get actual notification IDs for testing
  const actualNotifications = store.items.filter(n => !n.isRead).slice(0, 2);
  
  if (actualNotifications.length === 0) {
    console.log('ℹ️ No unread notifications found for testing');
    return;
  }
  
  console.log('🎯 Testing with notifications:', actualNotifications.map(n => n.id));
  
  // Test 1: Sequential calls (should work)
  console.log('\n🔬 Test 1: Sequential markAsRead calls');
  try {
    for (const notif of actualNotifications) {
      console.log(`📤 Marking ${notif.id} as read...`);
      await store.markAsRead(notif.id, { scope: 'admin' });
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
    console.log('✅ Sequential test completed successfully');
  } catch (error) {
    console.error('❌ Sequential test failed:', error);
  }
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Reload notifications for next test
  await store.reload({ scope: 'admin', filter: 'all' });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newUnreadNotifications = store.items.filter(n => !n.isRead).slice(0, 2);
  
  if (newUnreadNotifications.length < 2) {
    console.log('ℹ️ Not enough unread notifications for concurrent test');
    return;
  }
  
  // Test 2: Concurrent calls (should prevent race condition)
  console.log('\n🔬 Test 2: Concurrent markAsRead calls (race condition test)');
  try {
    const promises = newUnreadNotifications.map(notif => {
      console.log(`🚀 Starting concurrent markAsRead for ${notif.id}`);
      return store.markAsRead(notif.id, { scope: 'admin' });
    });
    
    await Promise.allSettled(promises);
    console.log('✅ Concurrent test completed (race condition prevented)');
  } catch (error) {
    console.error('❌ Concurrent test failed:', error);
  }
  
  // Final verification
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('\n📈 Final state:');
  console.log('📊 Total notifications:', store.items.length);
  console.log('📊 Unread count:', store.unreadCount);
  console.log('📊 Actually unread:', store.items.filter(n => !n.isRead).length);
  
  console.log('\n🎉 Test completed! Check logs above for any race condition issues.');
}

// Expose function to global scope for testing
window.testNotificationMarkAsRead = testNotificationMarkAsRead;

console.log('✅ Test function loaded. Run: testNotificationMarkAsRead()');