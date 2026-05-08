#!/usr/bin/env node
// Atomic release: pulls latest → bumps version → pushes.
// Run AFTER pushing all feature commits. Never run during parallel development.
// Usage: node scripts/release.js [patch|minor]

const { execSync } = require('child_process');
const path = require('path');

const bumpType = process.argv[2];
if (!['patch', 'minor'].includes(bumpType)) {
  console.error('Usage: node scripts/release.js [patch|minor]');
  console.error('  patch — bug fixes');
  console.error('  minor — new features');
  process.exit(1);
}

console.log('Pulling latest changes from main...');
try {
  execSync('git pull --rebase origin main', { stdio: 'inherit' });
} catch {
  console.error('git pull --rebase failed — resolve conflicts first, then re-run.');
  process.exit(1);
}

console.log(`Bumping version (${bumpType})...`);
execSync(`node ${path.join(__dirname, 'version-manager.js')} ${bumpType}`, { stdio: 'inherit' });

console.log('Pushing to main...');
try {
  execSync('git push -u origin main', { stdio: 'inherit' });
} catch {
  console.error('Push failed — another session may have pushed concurrently. Re-run this script.');
  process.exit(1);
}
