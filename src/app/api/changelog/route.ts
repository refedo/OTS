import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    const content = await readFile(changelogPath, 'utf-8');
    
    console.log('Changelog file read successfully, length:', content.length);
    
    // Parse the markdown content
    const versions = parseChangelog(content);
    
    console.log(`Parsed ${versions.length} versions from CHANGELOG.md`);
    if (versions.length > 0) {
      console.log(`Latest version: ${versions[0].version}`);
    } else {
      console.log('No versions found! First 500 chars:', content.substring(0, 500));
    }
    
    return NextResponse.json(versions);
  } catch (error) {
    console.error('Failed to read changelog:', error);
    return NextResponse.json({ error: 'Failed to read changelog' }, { status: 500 });
  }
}

function parseChangelog(content: string) {
  const versions: any[] = [];
  const lines = content.split('\n');
  
  let currentVersion: any = null;
  let currentSection: string | null = null;
  let currentSubsection: any = null;
  let inVersionSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Stop parsing when we hit roadmap or other non-version sections
    if (line.match(/^##\s+(Version Numbering|Upcoming Features|Migration Notes|Support)/i)) {
      break;
    }
    
    // Match version header: ## [2.7.0] - 2025-12-22
    const versionMatch = line.match(/^##\s*\[(\d+\.\d+\.\d+)\]\s*-\s*(.+)$/);
    if (versionMatch) {
      if (currentVersion) {
        versions.push(currentVersion);
      }
      
      inVersionSection = true;
      currentVersion = {
        version: versionMatch[1],
        date: versionMatch[2].trim(),
        type: getVersionType(versionMatch[1]),
        status: versions.length === 0 ? 'current' : 'stable',
        highlights: [],
        changes: {
          added: [],
          fixed: [],
          changed: [],
        },
      };
      currentSection = null;
      currentSubsection = null;
      continue;
    }
    
    // Only process content if we're in a version section
    if (!inVersionSection || !currentVersion) {
      continue;
    }
    
    // Match main heading: ### 🎨 UI/UX Enhancements & Modern Dialog System
    if (line.startsWith('### ')) {
      const title = line.replace(/^###\s+/, '').trim();
      if (!currentVersion.mainTitle) {
        currentVersion.mainTitle = title;
      }
      continue;
    }
    
    // Match section headers: #### Added, #### Fixed, #### Changed
    if (line.startsWith('#### ')) {
      const sectionName = line.replace(/^####\s+/, '').trim().toLowerCase();
      if (sectionName === 'added' || sectionName === 'fixed' || sectionName === 'changed' || sectionName === 'benefits') {
        currentSection = sectionName;
        currentSubsection = null;
      }
      continue;
    }
    
    // Match subsection headers: **Modern Dialog Components** or - **Import/Upload Functions**
    const subsectionMatch = line.match(/^-?\s*\*\*(.+?)\*\*$/);
    if (subsectionMatch && currentSection === 'added') {
      currentSubsection = {
        title: subsectionMatch[1],
        items: [],
      };
      currentVersion.changes.added.push(currentSubsection);
      continue;
    }
    
    // Match list items starting with - or •
    const itemMatch = line.match(/^[\s]*[-•]\s+(.+)$/);
    if (itemMatch) {
      const item = itemMatch[1].trim();
      
      // Skip if it's a subsection header (starts with **)
      if (item.startsWith('**')) {
        continue;
      }
      
      // Check if it's a highlight (before any section is defined)
      if (!currentSection && item) {
        currentVersion.highlights.push(item.replace(/['"]/g, ''));
      } else if (currentSection === 'added') {
        // If we have a subsection, add to it, otherwise create a generic subsection
        if (currentSubsection) {
          currentSubsection.items.push(item);
        } else {
          // Create a default subsection for items without explicit subsection
          currentSubsection = {
            title: 'Features',
            items: [item],
          };
          currentVersion.changes.added.push(currentSubsection);
        }
      } else if (currentSection === 'fixed') {
        currentVersion.changes.fixed.push(item);
      } else if (currentSection === 'changed') {
        currentVersion.changes.changed.push(item);
      }
    }
  }
  
  // Push the last version
  if (currentVersion) {
    versions.push(currentVersion);
  }
  
  return versions;
}

function getVersionType(version: string): string {
  const [major, minor, patch] = version.split('.').map(Number);
  
  if (major > 1 || (major === 1 && minor === 0 && patch === 0)) {
    return 'major';
  } else if (minor > 0) {
    return 'minor';
  } else {
    return 'patch';
  }
}
