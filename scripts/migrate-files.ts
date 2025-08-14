import { fileManager } from '../src/lib/fileManager';

async function migrateUserFiles() {
  const userId = 'cmebq202b0003sifpetk72s99'; // Replace with actual user ID
  
  console.log('Starting file migration for user:', userId);
  
  try {
    const result = await fileManager.migrateExistingFiles(userId);
    
    console.log(`Migration completed!`);
    console.log(`Files moved: ${result.moved}`);
    
    if (result.errors.length > 0) {
      console.log('Errors encountered:');
      result.errors.forEach(error => console.log(' -', error));
    }
    
    // List files after migration
    console.log('\nFiles after migration:');
    const files = await fileManager.listUserFiles(userId);
    
    Object.entries(files).forEach(([category, categoryFiles]) => {
      console.log(`\n${category.toUpperCase()}:`);
      categoryFiles.forEach(file => {
        console.log(`  - ${file.newName} (${file.size} bytes)`);
      });
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration
migrateUserFiles().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
