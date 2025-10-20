import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating existing SupportDocument records with default subtypes...');

  // Update SIMJA documents
  const simjaResult = await prisma.supportDocument.updateMany({
    where: {
      document_type: 'SIMJA',
      document_subtype: null,
    },
    data: {
      document_subtype: 'Ast. Man. Facility Management',
    },
  });
  console.log(`✅ Updated ${simjaResult.count} SIMJA documents`);

  // Update SIKA documents - set a default, they can be changed later
  const sikaResult = await prisma.supportDocument.updateMany({
    where: {
      document_type: 'SIKA',
      document_subtype: null,
    },
    data: {
      document_subtype: 'Pekerjaan Dingin',
    },
  });
  console.log(`✅ Updated ${sikaResult.count} SIKA documents (default: Pekerjaan Dingin)`);

  // HSSE documents should remain null
  const hsseCount = await prisma.supportDocument.count({
    where: {
      document_type: 'HSSE',
      document_subtype: null,
    },
  });
  console.log(`ℹ️  ${hsseCount} HSSE documents remain with null subtype (as expected)`);

  console.log('\n✨ Migration complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
