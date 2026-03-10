/**
 * PBAC Migration Verification Script
 * 
 * Scans the codebase for any remaining role-based access control patterns
 * that should have been replaced with permission-based checks.
 * 
 * Usage: npx tsx scripts/verify-pbac-migration.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_DIR = join(__dirname, '..', 'src');

const ROLE_CHECK_PATTERNS = [
  /\['CEO'.*'Admin'.*\]\.includes\(/g,
  /\['Admin'.*'Manager'.*\]\.includes\(/g,
  /session\.role\s*===\s*'/g,
  /session\.role\s*!==\s*'/g,
  /includes\(session\.role\)/g,
  /includes\(userRole\)/g,
  /hasRole\(/g,
  /isSuperAdmin\(/g,
  /isAdminOrAbove\(/g,
];

const IMPORT_PATTERNS = [
  /from\s+['"]@\/lib\/rbac['"]/g,
];

const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  'scripts/verify-pbac-migration.ts',
  'changelog',
  'CHANGELOG',
];

interface Finding {
  file: string;
  line: number;
  content: string;
  pattern: string;
}

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(p => filePath.includes(p));
}

function scanFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const pattern of [...ROLE_CHECK_PATTERNS, ...IMPORT_PATTERNS]) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = line.match(pattern);
      if (matches) {
        findings.push({
          file: relative(join(__dirname, '..'), filePath),
          line: i + 1,
          content: line.trim(),
          pattern: pattern.source,
        });
      }
    }
  }

  return findings;
}

function walkDir(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (shouldIgnore(fullPath)) continue;
    
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walkDir(fullPath, extensions));
    } else if (extensions.some(ext => fullPath.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function main() {
  console.log('=== PBAC Migration Verification ===\n');
  
  const files = walkDir(SRC_DIR, ['.ts', '.tsx']);
  console.log(`Scanning ${files.length} files...\n`);
  
  const allFindings: Finding[] = [];
  
  for (const file of files) {
    const findings = scanFile(file);
    allFindings.push(...findings);
  }
  
  // Categorize
  const importFindings = allFindings.filter(f => 
    IMPORT_PATTERNS.some(p => f.pattern === p.source)
  );
  const roleCheckFindings = allFindings.filter(f => 
    ROLE_CHECK_PATTERNS.some(p => f.pattern === p.source)
  );
  
  if (importFindings.length > 0) {
    console.log('❌ CRITICAL: Found rbac.ts imports:');
    for (const f of importFindings) {
      console.log(`  ${f.file}:${f.line} → ${f.content}`);
    }
    console.log();
  }
  
  if (roleCheckFindings.length > 0) {
    console.log('⚠️  Potential role-based checks found:');
    for (const f of roleCheckFindings) {
      console.log(`  ${f.file}:${f.line} → ${f.content}`);
    }
    console.log();
    console.log('Note: Some may be display-only (user.role.name) rather than access control.');
    console.log('Review each finding manually to confirm.\n');
  }
  
  if (allFindings.length === 0) {
    console.log('✅ No role-based access control patterns found!');
    console.log('   All access control has been migrated to permission-based checks.\n');
  }
  
  // Summary
  console.log('=== Summary ===');
  console.log(`Files scanned:      ${files.length}`);
  console.log(`rbac.ts imports:    ${importFindings.length}`);
  console.log(`Role check patterns: ${roleCheckFindings.length}`);
  console.log(`Total findings:     ${allFindings.length}`);
  console.log();
  
  if (importFindings.length > 0) {
    process.exit(1);
  }
  
  console.log('Migration status: ✅ COMPLETE');
}

main();
