const { FileManager } = require('./src/lib/fileManager');
const path = require('path');
const fs = require('fs');

async function testFileMigration() {
  console.log('🚀 Testing File Migration and Organization...\n');
  
  const fileManager = new FileManager();
  const testUserId = 'cmebq202b0003sifpetk72s99'; // Example user ID from database
  
  try {
    // 1. Test folder structure creation
    console.log('1. Testing folder structure creation...');
    const userFolders = fileManager.getUserFolderStructure(testUserId);
    console.log('User folders structure:', userFolders);
    
    // 2. Check if user directory exists
    const userDir = path.join(process.cwd(), 'uploads', testUserId);
    console.log(`\n2. Checking user directory: ${userDir}`);
    
    if (fs.existsSync(userDir)) {
      console.log('✅ User directory exists');
      
      // List existing files
      const files = fs.readdirSync(userDir);
      console.log('Existing files:', files);
      
      if (files.length > 0) {
        console.log('\n3. Testing file migration...');
        await fileManager.migrateExistingFiles(testUserId);
        console.log('✅ Migration completed');
        
        // Check new folder structure
        console.log('\n4. Checking new folder structure...');
        const newFiles = fs.readdirSync(userDir, { withFileTypes: true });
        newFiles.forEach(item => {
          if (item.isDirectory()) {
            console.log(`📁 ${item.name}/`);
            const subFiles = fs.readdirSync(path.join(userDir, item.name));
            subFiles.forEach(file => {
              console.log(`  📄 ${file}`);
            });
          } else {
            console.log(`📄 ${item.name}`);
          }
        });
      } else {
        console.log('ℹ️ No files to migrate');
      }
    } else {
      console.log('ℹ️ User directory does not exist yet');
    }
    
    // 3. Test file categorization
    console.log('\n5. Testing file categorization...');
    const testFiles = [
      { originalName: 'sika-document.pdf', fieldName: 'upload_doc_sika' },
      { originalName: 'simja-form.pdf', fieldName: 'upload_doc_simja' },
      { originalName: 'id-card.jpg', fieldName: 'upload_doc_id_card' },
      { originalName: 'other-file.docx', fieldName: 'other_document' }
    ];
    
    testFiles.forEach(file => {
      const category = fileManager.categorizeFile(file.fieldName, file.originalName);
      console.log(`📂 ${file.originalName} (${file.fieldName}) → ${category}`);
    });
    
    console.log('\n✅ File migration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run the test
testFileMigration();
