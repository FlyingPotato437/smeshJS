/**
 * Script to completely remove the pages/api directory to eliminate duplicate route warnings
 * Run this script with: node scripts/fix-duplicates.js
 */

const fs = require('fs');
const path = require('path');

function main() {
  console.log('Starting cleanup of duplicate API routes...');
  
  const pagesApiDir = path.join(__dirname, '..', 'pages', 'api');
  
  // Check if pages/api directory exists
  if (fs.existsSync(pagesApiDir)) {
    console.log(`Found pages/api directory at: ${pagesApiDir}`);
    
    try {
      // Completely remove the directory
      fs.rmSync(pagesApiDir, { recursive: true, force: true });
      console.log('✅ Successfully removed pages/api directory');
    } catch (error) {
      console.error(`❌ Error removing pages/api directory: ${error.message}`);
    }
  } else {
    console.log('The pages/api directory does not exist. No action needed.');
  }
  
  console.log('Done! Restart your Next.js server to see the changes take effect.');
}

main(); 