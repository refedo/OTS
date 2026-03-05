#!/usr/bin/env node

/**
 * Version Update Script
 * Updates version across the entire platform from the centralized version file
 * Usage: node scripts/update-version.js [new-version]
 * If no version is provided, it will use the version from lib/version.ts
 */

const fs = require('fs');
const path = require('path');

// Read the centralized version
const versionFile = path.join(__dirname, '../src/lib/version.ts');
const versionContent = fs.readFileSync(versionFile, 'utf8');

// Extract version from the file
const versionMatch = versionContent.match(/version: '([^']+)'/);
const currentVersion = versionMatch ? versionMatch[1] : null;

if (!currentVersion) {
  console.error('❌ Could not find version in src/lib/version.ts');
  process.exit(1);
}

const newVersion = process.argv[2] || currentVersion;

if (newVersion !== currentVersion) {
  // Update the centralized version file
  const updatedVersionContent = versionContent.replace(
    /version: '[^']+'/,
    `version: '${newVersion}'`
  );
  fs.writeFileSync(versionFile, updatedVersionContent);
  console.log(`✅ Updated src/lib/version.ts to v${newVersion}`);
}

// Files to update (excluding package.json which is handled separately)
const filesToUpdate = [
  {
    file: 'package.json',
    pattern: /"version": "[^"]+",/,
    replacement: `"version": "${newVersion}",`
  }
];

// Update each file
filesToUpdate.forEach(({ file, pattern, replacement }) => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const updatedContent = content.replace(pattern, replacement);
  
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`✅ Updated ${file} to v${newVersion}`);
  } else {
    console.log(`ℹ️  ${file} already at v${newVersion}`);
  }
});

console.log(`\n🎉 Version update complete! All files now at v${newVersion}`);
console.log('\n📝 Next steps:');
console.log('1. Run: npm run build');
console.log('2. Run: pm2 restart hexa-steel-ots (on production)');
console.log('3. Update CHANGELOG.md with new version details');
