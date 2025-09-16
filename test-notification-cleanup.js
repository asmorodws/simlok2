const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNotificationCleanup() {
  try {
    console.log('🧪 Testing notification cleanup functionality...');
    
    // Get all notifications to see their structure
    const allNotifications = await prisma.notification.findMany({
      take: 5,
      orderBy: { created_at: 'desc' }
    });
    
    console.log('\n📋 Sample notifications:');
    allNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. ID: ${notif.id}`);
      console.log(`   Type: ${notif.type}`);
      console.log(`   Title: ${notif.title}`);
      console.log(`   Message: ${notif.message}`);
      console.log(`   Data: ${notif.data}`);
      console.log(`   Created: ${notif.created_at}`);
      console.log('   ---');
    });
    
    // Test the cleanup function logic
    console.log('\n🔍 Testing cleanup logic...');
    
    // Find notifications that reference submissions
    const submissionNotifications = await prisma.notification.findMany({
      where: {
        OR: [
          { data: { contains: 'submissionId' } },
          { data: { contains: 'submission_id' } },
          { message: { contains: 'ID' } },
          { title: { contains: 'ID' } }
        ]
      }
    });
    
    console.log(`\n📊 Found ${submissionNotifications.length} notifications that might reference submissions:`);
    
    submissionNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.type} - ${notif.title}`);
      
      // Try to extract submission ID
      let submissionId = null;
      if (notif.data) {
        try {
          const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
          submissionId = data.submissionId || data.submission_id;
        } catch (e) {
          console.log(`   ❌ Error parsing data: ${e.message}`);
        }
      }
      
      // Extract from message/title
      if (!submissionId) {
        const idPattern = /ID[:\s]+([a-zA-Z0-9]+)/i;
        const messageMatch = notif.message.match(idPattern);
        const titleMatch = notif.title.match(idPattern);
        submissionId = messageMatch?.[1] || titleMatch?.[1];
      }
      
      console.log(`   Submission ID: ${submissionId || 'Not found'}`);
      console.log(`   Data: ${JSON.stringify(notif.data)}`);
    });
    
    // Test if any referenced submissions exist
    console.log('\n🔍 Checking if referenced submissions still exist...');
    
    for (const notif of submissionNotifications) {
      let submissionId = null;
      
      if (notif.data) {
        try {
          const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
          submissionId = data.submissionId || data.submission_id;
        } catch (e) {
          // ignore
        }
      }
      
      if (!submissionId) {
        const idPattern = /ID[:\s]+([a-zA-Z0-9]+)/i;
        const messageMatch = notif.message.match(idPattern);
        const titleMatch = notif.title.match(idPattern);
        submissionId = messageMatch?.[1] || titleMatch?.[1];
      }
      
      if (submissionId) {
        const submission = await prisma.submission.findUnique({
          where: { id: submissionId }
        });
        
        if (!submission) {
          console.log(`❌ Notification ${notif.id} references missing submission: ${submissionId}`);
          console.log(`   Type: ${notif.type}, Title: ${notif.title}`);
        } else {
          console.log(`✅ Notification ${notif.id} references existing submission: ${submissionId}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationCleanup();
