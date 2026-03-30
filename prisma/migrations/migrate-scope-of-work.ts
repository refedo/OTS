/**
 * Migration Script: Migrate existing project data to new ScopeOfWork + BuildingActivity structure.
 *
 * Run with: npx tsx prisma/migrations/migrate-scope-of-work.ts
 *
 * This script is idempotent — it skips projects/buildings that already have ScopeOfWork entries.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Activity definitions
// ---------------------------------------------------------------------------

interface ActivityDef {
  activityType: string;
  activityLabel: string;
  sortOrder: number;
}

/** Full set of activities applicable to Steel scope */
const STEEL_ACTIVITIES: ActivityDef[] = [
  { activityType: 'design', activityLabel: 'Design', sortOrder: 1 },
  { activityType: 'design_approval', activityLabel: 'Design Approval', sortOrder: 2 },
  { activityType: 'arch_approval', activityLabel: 'Architect Approval', sortOrder: 3 },
  { activityType: 'detailing', activityLabel: 'Detailing', sortOrder: 4 },
  { activityType: 'detailing_approval', activityLabel: 'Detailing Approval', sortOrder: 5 },
  { activityType: 'material_approval', activityLabel: 'Material Approval', sortOrder: 6 },
  { activityType: 'procurement', activityLabel: 'Procurement', sortOrder: 7 },
  { activityType: 'production', activityLabel: 'Production', sortOrder: 8 },
  { activityType: 'coating', activityLabel: 'Coating', sortOrder: 9 },
  { activityType: 'anchor_bolts', activityLabel: 'Anchor Bolts', sortOrder: 10 },
  { activityType: 'dispatch', activityLabel: 'Dispatch', sortOrder: 11 },
  { activityType: 'erection', activityLabel: 'Erection', sortOrder: 12 },
  { activityType: 'surveying_as_built', activityLabel: 'Surveying / As-Built', sortOrder: 13 },
];

/** Activities applicable to sheeting scopes (no production or coating) */
const SHEETING_ACTIVITIES: ActivityDef[] = [
  { activityType: 'design', activityLabel: 'Design', sortOrder: 1 },
  { activityType: 'design_approval', activityLabel: 'Design Approval', sortOrder: 2 },
  { activityType: 'arch_approval', activityLabel: 'Architect Approval', sortOrder: 3 },
  { activityType: 'detailing', activityLabel: 'Detailing', sortOrder: 4 },
  { activityType: 'detailing_approval', activityLabel: 'Detailing Approval', sortOrder: 5 },
  { activityType: 'material_approval', activityLabel: 'Material Approval', sortOrder: 6 },
  { activityType: 'procurement', activityLabel: 'Procurement', sortOrder: 7 },
  { activityType: 'anchor_bolts', activityLabel: 'Anchor Bolts', sortOrder: 8 },
  { activityType: 'dispatch', activityLabel: 'Dispatch', sortOrder: 9 },
  { activityType: 'erection', activityLabel: 'Erection', sortOrder: 10 },
  { activityType: 'surveying_as_built', activityLabel: 'Surveying / As-Built', sortOrder: 11 },
];

// ---------------------------------------------------------------------------
// Mapping from old scope-of-work selections to new activity types
// ---------------------------------------------------------------------------

/**
 * Maps an old scope label (from scopeOfWork text or scopeOfWorkJson) to a list
 * of activity types that should be marked as applicable.
 *
 * Some old labels also trigger the creation of additional ScopeOfWork entries
 * (e.g. "Roof Sheeting" creates a roof_sheeting scope).
 */
const OLD_SCOPE_TO_ACTIVITIES: Record<string, string[]> = {
  'Design': ['design', 'design_approval'],
  'Detailing': ['detailing', 'detailing_approval'],
  'Shop Drawing': ['detailing', 'detailing_approval'],
  'Shop Drawings': ['detailing', 'detailing_approval'],
  'Procurement': ['procurement'],
  'Procurement/Supply': ['procurement'],
  'Supply': ['procurement'],
  'Fabrication': ['production'],
  'Galvanization': ['coating'],
  'Painting': ['coating'],
  'Delivery': ['dispatch'],
  'Delivery & Logistics': ['dispatch'],
  'Erection': ['erection'],
};

/** Old scope labels that trigger creation of a sheeting ScopeOfWork entry */
const SHEETING_SCOPE_MAP: Record<string, { scopeType: string; scopeLabel: string }> = {
  'Roof Sheeting': { scopeType: 'roof_sheeting', scopeLabel: 'Roof Sheeting' },
  'Wall Sheeting': { scopeType: 'wall_sheeting', scopeLabel: 'Wall Sheeting' },
};

/** Default activity types that should always be marked applicable regardless of old scope */
const DEFAULT_ALWAYS_APPLICABLE = [
  'arch_approval',
  'material_approval',
  'anchor_bolts',
  'surveying_as_built',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseOldScopes(project: { scopeOfWork: string | null; scopeOfWorkJson: unknown }): string[] {
  // Prefer the JSON field if it exists
  if (project.scopeOfWorkJson) {
    const json = project.scopeOfWorkJson;
    if (Array.isArray(json)) {
      return json.filter((item): item is string => typeof item === 'string');
    }
    // Some projects may have stored it as { scopes: [...] } or similar
    if (typeof json === 'object' && json !== null && 'scopes' in json) {
      const scopes = (json as Record<string, unknown>).scopes;
      if (Array.isArray(scopes)) {
        return scopes.filter((item): item is string => typeof item === 'string');
      }
    }
  }

  // Fall back to the text field — comma or newline separated
  if (project.scopeOfWork) {
    return project.scopeOfWork
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

function deriveApplicableActivities(oldScopes: string[]): {
  steelActivities: Set<string>;
  sheetingScopes: { scopeType: string; scopeLabel: string }[];
} {
  const steelActivities = new Set<string>(DEFAULT_ALWAYS_APPLICABLE);
  const sheetingScopes: { scopeType: string; scopeLabel: string }[] = [];

  for (const scope of oldScopes) {
    // Check if this old scope maps to steel activities
    const activities = OLD_SCOPE_TO_ACTIVITIES[scope];
    if (activities) {
      for (const a of activities) {
        steelActivities.add(a);
      }
    }

    // Check if this old scope triggers a sheeting ScopeOfWork
    const sheeting = SHEETING_SCOPE_MAP[scope];
    if (sheeting) {
      sheetingScopes.push(sheeting);
    }
  }

  return { steelActivities, sheetingScopes };
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== ScopeOfWork Migration Script ===\n');

  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      scopeOfWork: true,
      scopeOfWorkJson: true,
      buildings: {
        where: { deletedAt: null },
        select: {
          id: true,
          designation: true,
          name: true,
          scopeOfWorks: { select: { id: true } },
        },
      },
    },
  });

  console.log(`Found ${projects.length} project(s).\n`);

  let projectsMigrated = 0;
  let projectsSkipped = 0;
  let projectsFailed = 0;
  let buildingsMigrated = 0;
  let scopeOfWorksCreated = 0;
  let activitiesCreated = 0;

  for (const project of projects) {
    // Skip projects with no buildings
    if (project.buildings.length === 0) {
      console.log(`[SKIP] ${project.projectNumber} "${project.name}" — no buildings`);
      projectsSkipped++;
      continue;
    }

    // Check if any building already has ScopeOfWork entries (idempotency)
    const hasExistingScopes = project.buildings.some((b) => b.scopeOfWorks.length > 0);
    if (hasExistingScopes) {
      console.log(`[SKIP] ${project.projectNumber} "${project.name}" — already has ScopeOfWork entries`);
      projectsSkipped++;
      continue;
    }

    // Parse old scope selections
    const oldScopes = parseOldScopes(project);
    const { steelActivities, sheetingScopes } = deriveApplicableActivities(oldScopes);

    console.log(
      `[MIGRATE] ${project.projectNumber} "${project.name}" — ` +
        `${project.buildings.length} building(s), old scopes: [${oldScopes.join(', ')}]`
    );

    try {
      await prisma.$transaction(async (tx) => {
        for (const building of project.buildings) {
          // 1. Create "Steel" ScopeOfWork for every building
          const steelScope = await tx.scopeOfWork.create({
            data: {
              projectId: project.id,
              buildingId: building.id,
              scopeType: 'steel',
              scopeLabel: 'Steel',
            },
          });
          scopeOfWorksCreated++;

          // 2. Create BuildingActivity records for the steel scope
          for (const actDef of STEEL_ACTIVITIES) {
            const isApplicable = steelActivities.has(actDef.activityType);
            await tx.buildingActivity.create({
              data: {
                projectId: project.id,
                buildingId: building.id,
                scopeOfWorkId: steelScope.id,
                activityType: actDef.activityType,
                activityLabel: actDef.activityLabel,
                isApplicable,
                sortOrder: actDef.sortOrder,
              },
            });
            activitiesCreated++;
          }

          // 3. Create sheeting ScopeOfWork entries if applicable
          for (let si = 0; si < sheetingScopes.length; si++) {
            const sheeting = sheetingScopes[si];

            const sheetingScope = await tx.scopeOfWork.create({
              data: {
                projectId: project.id,
                buildingId: building.id,
                scopeType: sheeting.scopeType,
                scopeLabel: sheeting.scopeLabel,
              },
            });
            scopeOfWorksCreated++;

            // Sheeting activities — derive applicability from old scopes
            // For sheeting scopes, applicable activities mirror what was selected
            // for steel, except production and coating are excluded (they're not in the list).
            for (const actDef of SHEETING_ACTIVITIES) {
              const isApplicable = steelActivities.has(actDef.activityType);
              await tx.buildingActivity.create({
                data: {
                  projectId: project.id,
                  buildingId: building.id,
                  scopeOfWorkId: sheetingScope.id,
                  activityType: actDef.activityType,
                  activityLabel: actDef.activityLabel,
                  isApplicable,
                  sortOrder: actDef.sortOrder,
                },
              });
              activitiesCreated++;
            }
          }

          buildingsMigrated++;
        }
      });

      projectsMigrated++;
    } catch (error) {
      console.error(
        `[ERROR] Failed to migrate ${project.projectNumber} "${project.name}":`,
        error instanceof Error ? error.message : error
      );
      projectsFailed++;
    }
  }

  // Summary
  console.log('\n=== Migration Summary ===');
  console.log(`Projects migrated:     ${projectsMigrated}`);
  console.log(`Projects skipped:      ${projectsSkipped}`);
  console.log(`Projects failed:       ${projectsFailed}`);
  console.log(`Buildings migrated:    ${buildingsMigrated}`);
  console.log(`ScopeOfWork created:   ${scopeOfWorksCreated}`);
  console.log(`Activities created:    ${activitiesCreated}`);
  console.log('========================\n');

  if (projectsFailed > 0) {
    console.log('WARNING: Some projects failed to migrate. Check errors above.');
    process.exit(1);
  }

  console.log('Migration completed successfully.');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
