const fs = require('fs');
const path = require('path');

// Function to check if a file is a text file based on extension
function isTextFile(filePath) {
    const textExtensions = ['.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.json', '.md', '.txt', '.yml', '.yaml', '.xml', '.svg'];
    const ext = path.extname(filePath).toLowerCase();
    return textExtensions.includes(ext);
}

// Function to check if a directory should be excluded
function shouldExcludeDirectory(dirPath, basePath) {
    const relativePath = basePath || path.basename(dirPath);
    
    // Exclude components folder specifically in src directory
    if (relativePath === 'components' && basePath === 'components') {
        return true;
    }
    
    return false;
}

// Function to read all files recursively
function readAllFiles(dirPath, basePath = '') {
    try {
        const items = fs.readdirSync(dirPath);
        
        items.forEach(item => {
            const fullPath = path.join(dirPath, item);
            const relativePath = path.join(basePath, item);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                // Check if this directory should be excluded
                if (shouldExcludeDirectory(fullPath, item)) {
                    console.log(`\n🚫 Excluded Directory: ${relativePath}/`);
                    console.log('=' + '='.repeat(50));
                    return; // Skip this directory
                }
                
                console.log(`\n📁 Directory: ${relativePath}/`);
                console.log('=' + '='.repeat(50));
                readAllFiles(fullPath, relativePath);
            } else if (stats.isFile() && isTextFile(fullPath)) {
                console.log(`\n📄 File: ${relativePath}`);
                console.log('-' + '-'.repeat(50));
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    console.log(content);
                    console.log('-' + '-'.repeat(50));
                } catch (error) {
                    console.log(`Error reading file: ${error.message}`);
                }
            } else {
                console.log(`\n⚠️  Skipped (binary/unsupported): ${relativePath}`);
            }
        });
    } catch (error) {
        console.log(`Error reading directory ${dirPath}: ${error.message}`);
    }
}

// Start reading from src directory
const srcPath = path.join(process.cwd(), 'src');
console.log(`Reading all text files from: ${srcPath}`);
console.log('📋 Note: Excluding components folder');
console.log('=' + '='.repeat(60));

readAllFiles(srcPath);