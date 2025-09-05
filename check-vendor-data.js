const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkVendorSubmissions() {
  try {
    const userId = 'cmevi912t0002si34tkyfb4vr';
    
    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        officer_name: true,
        vendor_name: true,
        role: true
      }
    });
    
    console.log('User:', user);
    
    // Check submissions count
    const submissionCount = await prisma.submission.count({
      where: { user_id: userId }
    });
    
    console.log('Submission count:', submissionCount);
    
    // Get all submissions for this user
    const submissions = await prisma.submission.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        job_description: true,
        approval_status: true,
        created_at: true
      }
    });
    
    console.log('Submissions:', submissions);
    
    // Get all submissions in database
    const allSubmissions = await prisma.submission.findMany({
      select: {
        id: true,
        user_id: true,
        job_description: true,
        approval_status: true,
        created_at: true
      },
      take: 10
    });
    
    console.log('All submissions (last 10):', allSubmissions);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVendorSubmissions();
