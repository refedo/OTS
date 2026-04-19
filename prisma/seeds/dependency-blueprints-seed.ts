/**
 * Dependency Blueprints Seed
 *
 * Seeds (or updates) dependency blueprints with the correct steel fabrication sequence:
 *   DOCUMENTATION → DESIGN → DETAILING → PROCUREMENT → PRODUCTION → COATING → DISPATCH → ERECTION
 *
 * Safe to re-run: if the default blueprint already exists but is missing DETAILING steps
 * (legacy data from before v19.6.1), its steps are replaced with the correct sequence.
 */

import { PrismaClient, WorkUnitType, DependencyType } from '@prisma/client';

const prisma = new PrismaClient();

// The canonical step sequence for standard steel fabrication
const STANDARD_STEPS = [
  // Arch drawing approval must finish before design starts
  { fromType: WorkUnitType.DOCUMENTATION, toType: WorkUnitType.DESIGN,       dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 1 },
  // Design must be approved before shop drawings (detailing) can start
  { fromType: WorkUnitType.DESIGN,        toType: WorkUnitType.DETAILING,    dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 2 },
  // Shop drawings must be approved before procurement can start
  { fromType: WorkUnitType.DETAILING,     toType: WorkUnitType.PROCUREMENT,  dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 3 },
  // Materials must be sourced before production starts
  { fromType: WorkUnitType.PROCUREMENT,   toType: WorkUnitType.PRODUCTION,   dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 4 },
  // Fabrication must complete before coating (surface treatment)
  { fromType: WorkUnitType.PRODUCTION,    toType: WorkUnitType.COATING,      dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 5 },
  // Coating must complete before dispatch & delivery
  { fromType: WorkUnitType.COATING,       toType: WorkUnitType.DISPATCH,     dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 6 },
  // Dispatch must complete before site erection can start
  { fromType: WorkUnitType.DISPATCH,      toType: WorkUnitType.ERECTION,     dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 7 },
];

async function seedDependencyBlueprints() {
  console.log('🔧 Seeding Dependency Blueprints...');

  // ── Default blueprint: create or update ─────────────────────────────────────
  const defaultBlueprint = await prisma.dependencyBlueprint.findFirst({
    where: { isDefault: true },
    include: { steps: true },
  });

  if (defaultBlueprint) {
    const hasDetailing = defaultBlueprint.steps.some(
      (s) => s.fromType === WorkUnitType.DETAILING || s.toType === WorkUnitType.DETAILING
    );

    if (hasDetailing) {
      console.log(`  ℹ️  Default blueprint "${defaultBlueprint.name}" is already up to date. Skipping.`);
    } else {
      console.log(`  ⚠️  Default blueprint "${defaultBlueprint.name}" is missing DETAILING steps — updating...`);
      // Delete all old steps and replace with the correct sequence
      await prisma.dependencyBlueprintStep.deleteMany({ where: { blueprintId: defaultBlueprint.id } });
      for (const step of STANDARD_STEPS) {
        await prisma.dependencyBlueprintStep.create({ data: { ...step, blueprintId: defaultBlueprint.id } });
      }
      await prisma.dependencyBlueprint.update({
        where: { id: defaultBlueprint.id },
        data: {
          description:
            'Standard workflow for steel fabrication projects: Arch Approval → Design → Detailing → Procurement → Production → Coating → Dispatch → Erection.',
        },
      });
      console.log(`  ✅ Updated default blueprint with ${STANDARD_STEPS.length} steps.`);
    }
  } else {
    // No default blueprint exists — create it fresh
    const created = await prisma.dependencyBlueprint.create({
      data: {
        name: 'Standard Steel Fabrication',
        description:
          'Standard workflow for steel fabrication projects: Arch Approval → Design → Detailing → Procurement → Production → Coating → Dispatch → Erection.',
        isActive: true,
        isDefault: true,
        steps: { create: STANDARD_STEPS },
      },
      include: { steps: true },
    });
    console.log(`  ✅ Created blueprint: "${created.name}" with ${created.steps.length} steps (DEFAULT)`);
  }

  // ── PEB blueprint ────────────────────────────────────────────────────────────
  const pebExists = await prisma.dependencyBlueprint.findFirst({ where: { structureType: 'PEB' } });
  if (!pebExists) {
    const peb = await prisma.dependencyBlueprint.create({
      data: {
        name: 'PEB Project',
        description:
          'Workflow for Pre-Engineered Building projects (tighter coupling between stages).',
        structureType: 'PEB',
        isActive: true,
        isDefault: false,
        steps: {
          create: [
            { fromType: WorkUnitType.DOCUMENTATION, toType: WorkUnitType.DESIGN,      dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 1 },
            { fromType: WorkUnitType.DESIGN,        toType: WorkUnitType.DETAILING,   dependencyType: DependencyType.FS, lagDays: 2, sequenceOrder: 2 },
            { fromType: WorkUnitType.DETAILING,     toType: WorkUnitType.PROCUREMENT, dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 3 },
            { fromType: WorkUnitType.PROCUREMENT,   toType: WorkUnitType.PRODUCTION,  dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 4 },
            { fromType: WorkUnitType.PRODUCTION,    toType: WorkUnitType.COATING,     dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 5 },
            { fromType: WorkUnitType.COATING,       toType: WorkUnitType.DISPATCH,    dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 6 },
            { fromType: WorkUnitType.DISPATCH,      toType: WorkUnitType.ERECTION,    dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 7 },
          ],
        },
      },
      include: { steps: true },
    });
    console.log(`  ✅ Created blueprint: "${peb.name}" with ${peb.steps.length} steps (Structure: PEB)`);
  } else {
    console.log(`  ℹ️  PEB blueprint already exists. Skipping.`);
  }

  // ── Heavy Steel blueprint ─────────────────────────────────────────────────────
  const heavyExists = await prisma.dependencyBlueprint.findFirst({ where: { structureType: 'Heavy Steel' } });
  if (!heavyExists) {
    const heavy = await prisma.dependencyBlueprint.create({
      data: {
        name: 'Heavy Steel Structure',
        description:
          'Workflow for heavy steel structures with longer design review lags.',
        structureType: 'Heavy Steel',
        isActive: true,
        isDefault: false,
        steps: {
          create: [
            { fromType: WorkUnitType.DOCUMENTATION, toType: WorkUnitType.DESIGN,      dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 1 },
            { fromType: WorkUnitType.DESIGN,        toType: WorkUnitType.DETAILING,   dependencyType: DependencyType.FS, lagDays: 3, sequenceOrder: 2 },
            { fromType: WorkUnitType.DETAILING,     toType: WorkUnitType.PROCUREMENT, dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 3 },
            { fromType: WorkUnitType.PROCUREMENT,   toType: WorkUnitType.PRODUCTION,  dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 4 },
            { fromType: WorkUnitType.PRODUCTION,    toType: WorkUnitType.COATING,     dependencyType: DependencyType.FS, lagDays: 1, sequenceOrder: 5 },
            { fromType: WorkUnitType.COATING,       toType: WorkUnitType.DISPATCH,    dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 6 },
            { fromType: WorkUnitType.DISPATCH,      toType: WorkUnitType.ERECTION,    dependencyType: DependencyType.FS, lagDays: 0, sequenceOrder: 7 },
          ],
        },
      },
      include: { steps: true },
    });
    console.log(`  ✅ Created blueprint: "${heavy.name}" with ${heavy.steps.length} steps (Structure: Heavy Steel)`);
  } else {
    console.log(`  ℹ️  Heavy Steel blueprint already exists. Skipping.`);
  }

  console.log('✅ Dependency Blueprints seeded successfully!');
}

export { seedDependencyBlueprints };

seedDependencyBlueprints()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Error seeding dependency blueprints:', e);
    prisma.$disconnect();
    process.exit(1);
  });
