import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkSubmissionStatus() {
  console.log("🔍 Mengecek status semua submission...\n");
  
  const submissions = await prisma.submission.findMany({
    include: {
      user: {
        select: {
          vendor_name: true,
          officer_name: true,
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  console.log(`📊 Total submissions: ${submissions.length}\n`);

  // Group by status
  const statusCount = submissions.reduce((acc, sub) => {
    acc[sub.approval_status] = (acc[sub.approval_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("📈 Status breakdown:");
  Object.entries(statusCount).forEach(([status, count]) => {
    const emoji = status === 'PENDING' ? '⏳' : status === 'APPROVED' ? '✅' : '❌';
    console.log(`   ${emoji} ${status}: ${count} submissions`);
  });

  console.log("\n📋 Detail submissions:");
  submissions.forEach((sub, index) => {
    const statusEmoji = sub.approval_status === 'PENDING' ? '⏳' : sub.approval_status === 'APPROVED' ? '✅' : '❌';
    console.log(`   ${index + 1}. ${statusEmoji} ${sub.user.vendor_name} - ${sub.job_description}`);
    console.log(`      Status: ${sub.approval_status}`);
    console.log(`      Created: ${sub.created_at.toLocaleDateString('id-ID')}`);
    console.log(`      QR Code: ${sub.qrcode}`);
    console.log("");
  });

  // Check specific fields for pending submissions
  const pendingSubmissions = submissions.filter(sub => sub.approval_status === 'PENDING');
  
  if (pendingSubmissions.length > 0) {
    console.log("🔍 Verifikasi submission pending:");
    console.log(`   ✓ Semua ${pendingSubmissions.length} submission berstatus PENDING`);
    console.log("   ✓ Tidak ada approved_by yang terisi");
    console.log("   ✓ Tidak ada simlok_number yang terisi");
    console.log("   ✓ Tidak ada implementation_start_date yang terisi");
    console.log("   ✓ Tidak ada implementation_end_date yang terisi");
    
    // Verify no approved fields are filled
    const hasApprovedFields = pendingSubmissions.some(sub => 
      sub.approved_by || 
      sub.simlok_number || 
      sub.implementation_start_date || 
      sub.implementation_end_date ||
      sub.implementation ||
      sub.other_notes ||
      sub.content
    );
    
    if (hasApprovedFields) {
      console.log("   ⚠️ Warning: Beberapa submission pending memiliki data approval!");
    } else {
      console.log("   ✅ Semua submission pending tidak memiliki data approval");
    }
  }
}

checkSubmissionStatus()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
