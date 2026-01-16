import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const operationStages = [
  {
    stageCode: 'ARCH_APPROVED',
    stageName: 'Architectural Drawings Approved',
    orderIndex: 1,
    autoSource: 'document_control:ARCH_DRAWING:Approved',
    description: 'Architectural drawings have been approved by client',
    color: '#10b981', // green
    icon: '✓',
    isMandatory: true,
  },
  {
    stageCode: 'DESIGN_SUBMITTED',
    stageName: 'Design Package Submitted',
    orderIndex: 2,
    autoSource: 'document_control:DESIGN_PACKAGE:Submitted',
    description: 'Structural design package submitted for approval',
    color: '#3b82f6', // blue
    icon: '📤',
    isMandatory: true,
  },
  {
    stageCode: 'DESIGN_APPROVED',
    stageName: 'Design Package Approved',
    orderIndex: 3,
    autoSource: 'document_control:DESIGN_PACKAGE:Approved',
    description: 'Structural design package approved by client',
    color: '#10b981', // green
    icon: '✓',
    isMandatory: true,
  },
  {
    stageCode: 'SHOP_SUBMITTED',
    stageName: 'Shop Drawings Submitted',
    orderIndex: 4,
    autoSource: 'document_control:SHOP_DRAWING:Submitted',
    description: 'Shop drawings submitted for approval',
    color: '#3b82f6', // blue
    icon: '📤',
    isMandatory: true,
  },
  {
    stageCode: 'SHOP_APPROVED',
    stageName: 'Shop Drawings Approved',
    orderIndex: 5,
    autoSource: 'document_control:SHOP_DRAWING:Approved',
    description: 'Shop drawings approved by client',
    color: '#10b981', // green
    icon: '✓',
    isMandatory: true,
  },
  {
    stageCode: 'PROCUREMENT_START',
    stageName: 'Procurement Started',
    orderIndex: 6,
    autoSource: 'procurement:PURCHASE_ORDER:Created',
    description: 'Material procurement has started',
    color: '#8b5cf6', // purple
    icon: '🛒',
    isMandatory: true,
  },
  {
    stageCode: 'PRODUCTION_START',
    stageName: 'Production Started',
    orderIndex: 7,
    autoSource: 'production:PRODUCTION_LOG:Created',
    description: 'Fabrication and production has started',
    color: '#f59e0b', // amber
    icon: '⚙️',
    isMandatory: true,
  },
  {
    stageCode: 'COATING_OR_GALVANIZED',
    stageName: 'Coating/Galvanization Completed',
    orderIndex: 8,
    autoSource: 'production:COATING:Completed',
    description: 'Surface treatment (coating or galvanization) completed',
    color: '#06b6d4', // cyan
    icon: '🎨',
    isMandatory: false,
  },
  {
    stageCode: 'DISPATCHING',
    stageName: 'Dispatch to Site',
    orderIndex: 9,
    autoSource: 'production:DISPATCH:Created',
    description: 'Materials dispatched to construction site',
    color: '#ec4899', // pink
    icon: '🚚',
    isMandatory: true,
  },
  {
    stageCode: 'ERECTION_START',
    stageName: 'Erection Started',
    orderIndex: 10,
    autoSource: 'production:ERECTION:Started',
    description: 'On-site erection has started',
    color: '#f97316', // orange
    icon: '🏗️',
    isMandatory: true,
  },
  {
    stageCode: 'ERECTION_COMPLETED',
    stageName: 'Erection Completed',
    orderIndex: 11,
    autoSource: 'production:ERECTION:Completed',
    description: 'On-site erection completed',
    color: '#10b981', // green
    icon: '✓',
    isMandatory: true,
  },
];

export async function seedOperationStages() {
  console.log('Seeding operation stages...');

  for (const stage of operationStages) {
    await prisma.operationStageConfig.upsert({
      where: { stageCode: stage.stageCode },
      update: stage,
      create: stage,
    });
  }

  console.log(`✓ Seeded ${operationStages.length} operation stages`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  seedOperationStages()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
