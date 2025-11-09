import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const result = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Submission' 
        AND COLUMN_NAME IN ('work_location', 'work_facilities')
      ORDER BY COLUMN_NAME;
    ` as any[];
    
    console.log('Current column types:');
    console.table(result.map(row => ({
      column: row.COLUMN_NAME,
      type: row.DATA_TYPE,
      maxLength: row.CHARACTER_MAXIMUM_LENGTH ? String(row.CHARACTER_MAXIMUM_LENGTH) : 'NULL'
    })));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
