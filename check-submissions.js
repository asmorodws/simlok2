const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSubmissions() {
  try {
    console.log('📊 Checking Submissions with SIKA & SIMJA data:\n');
    
    const submissions = await prisma.submission.findMany({
      select: {
        id: true,
        vendor_name: true,
        job_description: true,
        sika_number: true,
        sika_date: true,
        simja_number: true,
        simja_date: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
    
    console.log(`Found ${submissions.length} submissions:\n`);
    
    submissions.forEach((submission, index) => {
      console.log(`${index + 1}. ${submission.vendor_name}`);
      console.log(`   Job: ${submission.job_description.substring(0, 50)}...`);
      console.log(`   SIKA: ${submission.sika_number} (${submission.sika_date?.toLocaleDateString('id-ID')})`);
      console.log(`   SIMJA: ${submission.simja_number} (${submission.simja_date?.toLocaleDateString('id-ID')})`);
      console.log(`   Created: ${submission.created_at.toLocaleDateString('id-ID')}`);
      console.log();
    });
    
    // Check statistics
    const totalSubmissions = await prisma.submission.count();
    const withSika = await prisma.submission.count({
      where: { sika_number: { not: null } }
    });
    const withSimja = await prisma.submission.count({
      where: { simja_number: { not: null } }
    });
    
    console.log('📈 Statistics:');
    console.log(`   Total Submissions: ${totalSubmissions}`);
    console.log(`   With SIKA Number: ${withSika} (${((withSika / totalSubmissions) * 100).toFixed(1)}%)`);
    console.log(`   With SIMJA Number: ${withSimja} (${((withSimja / totalSubmissions) * 100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubmissions();