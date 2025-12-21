/**
 * Dependency Blueprints Seed
 * 
 * Seeds default dependency blueprints for automatic workflow dependency creation.
 * 
 * Blueprints define the standard flow:
 * DESIGN → PROCUREMENT (parallel)
 * DESIGN → PRODUCTION (after design)
 * PROCUREMENT → PRODUCTION (materials needed)
 * PRODUCTION → QC (inspection after fabrication)
 * QC → DOCUMENTATION (as-built after QC approval)
 */

import { PrismaClient, WorkUnitType, DependencyType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDependencyBlueprints() {
  console.log('🔧 Seeding Dependency Blueprints...');

  // Check if blueprints already exist
  const existingCount = await prisma.dependencyBlueprint.count();
  if (existingCount > 0) {
    console.log(`  ℹ️  ${existingCount} blueprints already exist. Skipping seed.`);
    return;
  }

  // Create Standard Steel Fabrication Blueprint (Default)
  const standardBlueprint = await prisma.dependencyBlueprint.create({
    data: {
      name: 'Standard Steel Fabrication',
      description: 'Default workflow for steel fabrication projects. Covers Design → Procurement → Production → QC → Documentation flow.',
      isActive: true,
      isDefault: true,
      steps: {
        create: [
          // DESIGN is the starting point - no upstream dependencies
          // DESIGN → PRODUCTION (design must finish before production starts)
          {
            fromType: WorkUnitType.DESIGN,
            toType: WorkUnitType.PRODUCTION,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 1,
          },
          // DESIGN → PROCUREMENT (procurement can start after design)
          {
            fromType: WorkUnitType.DESIGN,
            toType: WorkUnitType.PROCUREMENT,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 2,
          },
          // PROCUREMENT → PRODUCTION (materials needed for production)
          {
            fromType: WorkUnitType.PROCUREMENT,
            toType: WorkUnitType.PRODUCTION,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 3,
          },
          // PRODUCTION → QC (QC inspection after fabrication)
          {
            fromType: WorkUnitType.PRODUCTION,
            toType: WorkUnitType.QC,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 4,
          },
          // QC → DOCUMENTATION (as-built docs after QC approval)
          {
            fromType: WorkUnitType.QC,
            toType: WorkUnitType.DOCUMENTATION,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 5,
          },
        ],
      },
    },
    include: { steps: true },
  });

  console.log(`  ✅ Created blueprint: "${standardBlueprint.name}" with ${standardBlueprint.steps.length} steps (DEFAULT)`);

  // Create PEB (Pre-Engineered Building) Blueprint
  const pebBlueprint = await prisma.dependencyBlueprint.create({
    data: {
      name: 'PEB Project',
      description: 'Workflow for Pre-Engineered Building projects. Similar to standard but with tighter coupling.',
      structureType: 'PEB',
      isActive: true,
      isDefault: false,
      steps: {
        create: [
          // DESIGN → PRODUCTION
          {
            fromType: WorkUnitType.DESIGN,
            toType: WorkUnitType.PRODUCTION,
            dependencyType: DependencyType.FS,
            lagDays: 2, // 2-day lag for PEB design review
            sequenceOrder: 1,
          },
          // DESIGN → PROCUREMENT
          {
            fromType: WorkUnitType.DESIGN,
            toType: WorkUnitType.PROCUREMENT,
            dependencyType: DependencyType.SS, // Start-to-Start: procurement can start when design starts
            lagDays: 5, // 5-day lag
            sequenceOrder: 2,
          },
          // PROCUREMENT → PRODUCTION
          {
            fromType: WorkUnitType.PROCUREMENT,
            toType: WorkUnitType.PRODUCTION,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 3,
          },
          // PRODUCTION → QC
          {
            fromType: WorkUnitType.PRODUCTION,
            toType: WorkUnitType.QC,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 4,
          },
          // QC → DOCUMENTATION
          {
            fromType: WorkUnitType.QC,
            toType: WorkUnitType.DOCUMENTATION,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 5,
          },
        ],
      },
    },
    include: { steps: true },
  });

  console.log(`  ✅ Created blueprint: "${pebBlueprint.name}" with ${pebBlueprint.steps.length} steps (Structure: PEB)`);

  // Create Heavy Steel Blueprint
  const heavySteelBlueprint = await prisma.dependencyBlueprint.create({
    data: {
      name: 'Heavy Steel Structure',
      description: 'Workflow for heavy steel structures requiring more QC checkpoints.',
      structureType: 'Heavy Steel',
      isActive: true,
      isDefault: false,
      steps: {
        create: [
          // DESIGN → PRODUCTION (longer lag for complex designs)
          {
            fromType: WorkUnitType.DESIGN,
            toType: WorkUnitType.PRODUCTION,
            dependencyType: DependencyType.FS,
            lagDays: 3,
            sequenceOrder: 1,
          },
          // DESIGN → PROCUREMENT
          {
            fromType: WorkUnitType.DESIGN,
            toType: WorkUnitType.PROCUREMENT,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 2,
          },
          // PROCUREMENT → PRODUCTION
          {
            fromType: WorkUnitType.PROCUREMENT,
            toType: WorkUnitType.PRODUCTION,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 3,
          },
          // PRODUCTION → QC
          {
            fromType: WorkUnitType.PRODUCTION,
            toType: WorkUnitType.QC,
            dependencyType: DependencyType.FS,
            lagDays: 1, // 1-day lag for heavy steel QC prep
            sequenceOrder: 4,
          },
          // QC → DOCUMENTATION
          {
            fromType: WorkUnitType.QC,
            toType: WorkUnitType.DOCUMENTATION,
            dependencyType: DependencyType.FS,
            lagDays: 0,
            sequenceOrder: 5,
          },
        ],
      },
    },
    include: { steps: true },
  });

  console.log(`  ✅ Created blueprint: "${heavySteelBlueprint.name}" with ${heavySteelBlueprint.steps.length} steps (Structure: Heavy Steel)`);

  console.log('✅ Dependency Blueprints seeded successfully!');
}

// Export for use in main seed file
export { seedDependencyBlueprints };

// Direct execution
seedDependencyBlueprints()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Error seeding dependency blueprints:', e);
    prisma.$disconnect();
    process.exit(1);
  });
