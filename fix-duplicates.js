/**
 * Script to fix duplicate routes by removing files in the pages/api directory
 * Run this script with: node fix-duplicates.js
 */

const fs = require('fs');
const path = require('path');

// Path to pages/api directory
const pagesApiDir = path.join(__dirname, 'pages', 'api');

// Check if pages/api directory exists
if (fs.existsSync(pagesApiDir)) {
  console.log('Found pages/api directory, checking for files...');
  
  // Read all files in the directory
  const files = fs.readdirSync(pagesApiDir);
  
  if (files.length === 0) {
    console.log('No files found in pages/api directory.');
  } else {
    console.log(`Found ${files.length} files in pages/api directory.`);
    
    // Delete each file
    files.forEach(file => {
      const filePath = path.join(pagesApiDir, file);
      
      // Check if it's a file
      if (fs.statSync(filePath).isFile()) {
        try {
          fs.unlinkSync(filePath);
          console.log(`✅ Deleted: ${file}`);
        } catch (error) {
          console.error(`❌ Failed to delete ${file}: ${error.message}`);
        }
      } else {
        console.log(`Skipping directory: ${file}`);
      }
    });
    
    console.log('Finished cleaning up duplicate routes.');
  }
  
  // Check if the directory is empty and remove it
  const remainingFiles = fs.readdirSync(pagesApiDir);
  if (remainingFiles.length === 0) {
    try {
      fs.rmdirSync(pagesApiDir);
      console.log('✅ Removed empty pages/api directory.');
    } catch (error) {
      console.error(`❌ Failed to remove pages/api directory: ${error.message}`);
    }
  }
} else {
  console.log('No pages/api directory found. No action needed.');
}

console.log('Done! The duplicate routes issue should be resolved.');
console.log('Restart the development server to see the changes take effect.'); 