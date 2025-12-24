#!/usr/bin/env node

/**
 * Version Manager Script
 * Manages version bumping, changelog updates, and ensures consistency
 * across package.json, CHANGELOG.md, and UI components
 * 
 * Usage:
 *   node scripts/version-manager.js patch   # 1.0.0 -> 1.0.1
 *   node scripts/version-manager.js minor   # 1.0.0 -> 1.1.0
 *   node scripts/version-manager.js major   # 1.0.0 -> 2.0.0
 *   node scripts/version-manager.js current # Show current version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// File paths
const ROOT_DIR = path.join(__dirname, '..');
const PACKAGE_JSON = path.join(ROOT_DIR, 'package.json');
const CHANGELOG_MD = path.join(ROOT_DIR, 'CHANGELOG.md');
const APP_SIDEBAR = path.join(ROOT_DIR, 'src', 'components', 'app-sidebar.tsx');
const LOGIN_FORM = path.join(ROOT_DIR, 'src', 'components', 'login-form.tsx');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  return pkg.version;
}

function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function bumpVersion(version, type) {
  const { major, minor, patch } = parseVersion(version);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${type}. Use major, minor, or patch.`);
  }
}

function updatePackageJson(newVersion) {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n');
  log(`✓ Updated package.json to v${newVersion}`, 'green');
}

function updateChangelog(newVersion) {
  const content = fs.readFileSync(CHANGELOG_MD, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  
  // Check if version already exists
  if (content.includes(`## [${newVersion}]`)) {
    log(`⚠ Version ${newVersion} already exists in CHANGELOG.md`, 'yellow');
    return;
  }
  
  // Find the position after the header
  const headerEnd = content.indexOf('---\n') + 4;
  
  // Create new version entry
  const newEntry = `\n## [${newVersion}] - ${today}\n\n### Added\n- \n\n### Changed\n- \n\n### Fixed\n- \n\n---\n`;
  
  // Insert new entry
  const updatedContent = content.slice(0, headerEnd) + newEntry + content.slice(headerEnd);
  fs.writeFileSync(CHANGELOG_MD, updatedContent);
  
  log(`✓ Added v${newVersion} entry to CHANGELOG.md`, 'green');
  log(`  Please edit CHANGELOG.md to add release notes`, 'cyan');
}

function updateSidebarVersion(newVersion) {
  let content = fs.readFileSync(APP_SIDEBAR, 'utf8');
  
  // Update version in sidebar footer
  const versionRegex = /Hexa Steel® OTS v[\d.]+/g;
  content = content.replace(versionRegex, `Hexa Steel® OTS v${newVersion}`);
  
  fs.writeFileSync(APP_SIDEBAR, content);
  log(`✓ Updated app-sidebar.tsx to v${newVersion}`, 'green');
}

function updateLoginForm(newVersion) {
  let content = fs.readFileSync(LOGIN_FORM, 'utf8');
  
  // Update version in login page
  const versionRegex = /Operations Tracking System v[\d.]+/g;
  content = content.replace(versionRegex, `Operations Tracking System v${newVersion}`);
  
  fs.writeFileSync(LOGIN_FORM, content);
  log(`✓ Updated login-form.tsx to v${newVersion}`, 'green');
}

function createGitTag(version) {
  try {
    // Check if tag already exists
    try {
      execSync(`git rev-parse v${version}`, { stdio: 'ignore' });
      log(`⚠ Git tag v${version} already exists`, 'yellow');
      return;
    } catch {
      // Tag doesn't exist, create it
    }
    
    // Create annotated tag
    execSync(`git tag -a v${version} -m "Release v${version}"`, { stdio: 'inherit' });
    log(`✓ Created git tag v${version}`, 'green');
    log(`  Push tag with: git push origin v${version}`, 'cyan');
  } catch (error) {
    log(`✗ Failed to create git tag: ${error.message}`, 'red');
  }
}

function showCurrentVersion() {
  const version = getCurrentVersion();
  log(`\nCurrent version: ${version}`, 'blue');
  
  // Show what the next versions would be
  log(`\nNext versions:`, 'cyan');
  log(`  Patch: ${bumpVersion(version, 'patch')} (bug fixes)`, 'reset');
  log(`  Minor: ${bumpVersion(version, 'minor')} (new features)`, 'reset');
  log(`  Major: ${bumpVersion(version, 'major')} (breaking changes)`, 'reset');
}

function commitChanges(version) {
  try {
    // Stage all version-related files
    execSync('git add package.json CHANGELOG.md src/components/app-sidebar.tsx src/components/login-form.tsx', { stdio: 'inherit' });
    
    // Commit with version message
    execSync(`git commit -m "chore: bump version to v${version}"`, { stdio: 'inherit' });
    log(`✓ Committed version changes`, 'green');
  } catch (error) {
    log(`⚠ Could not commit changes (may already be committed)`, 'yellow');
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help') {
    log('\nVersion Manager - Hexa Steel OTS', 'blue');
    log('\nUsage:', 'cyan');
    log('  node scripts/version-manager.js <command>', 'reset');
    log('\nCommands:', 'cyan');
    log('  current  Show current version', 'reset');
    log('  patch    Bump patch version (1.0.0 -> 1.0.1)', 'reset');
    log('  minor    Bump minor version (1.0.0 -> 1.1.0)', 'reset');
    log('  major    Bump major version (1.0.0 -> 2.0.0)', 'reset');
    log('\nSemantic Versioning:', 'cyan');
    log('  MAJOR: Breaking changes', 'reset');
    log('  MINOR: New features (backward compatible)', 'reset');
    log('  PATCH: Bug fixes (backward compatible)', 'reset');
    return;
  }
  
  if (command === 'current') {
    showCurrentVersion();
    return;
  }
  
  if (!['major', 'minor', 'patch'].includes(command)) {
    log(`✗ Invalid command: ${command}`, 'red');
    log('  Use: major, minor, patch, or current', 'yellow');
    process.exit(1);
  }
  
  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, command);
  
  log(`\n🚀 Bumping version from ${currentVersion} to ${newVersion}`, 'blue');
  log('─'.repeat(50), 'cyan');
  
  try {
    // Update all files
    updatePackageJson(newVersion);
    updateChangelog(newVersion);
    updateSidebarVersion(newVersion);
    updateLoginForm(newVersion);
    
    log('─'.repeat(50), 'cyan');
    log(`\n✅ Version bump complete!`, 'green');
    log(`\nNext steps:`, 'cyan');
    log(`  1. Edit CHANGELOG.md to add release notes for v${newVersion}`, 'reset');
    log(`  2. Review changes: git diff`, 'reset');
    log(`  3. Commit: git add . && git commit -m "chore: release v${newVersion}"`, 'reset');
    log(`  4. Tag: git tag -a v${newVersion} -m "Release v${newVersion}"`, 'reset');
    log(`  5. Push: git push origin main --tags`, 'reset');
    log(`  6. Create GitHub release from tag v${newVersion}`, 'reset');
    
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
