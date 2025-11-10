import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OPERATION_STAGES = [
  {
    stageCode: 'CONTRACT_SIGNED',
    stageName: 'Signing Contract',
    stageOrder: 1,
    autoSource: null,
    description: 'Contract signed with client',
    color: '#3b82f6',
    icon: '📝',
    isMandatory: true,
  },
  {
    stageCode: 'DOWN_PAYMENT_RECEIVED',
    stageName: 'Down Payment Receiving',
    stageOrder: 2,
    autoSource: null,
    description: 'Down payment received from client',
    color: '#10b981',
    icon: '💰',
    isMandatory: true,
  },
  {
    stageCode: 'DESIGN_SUBMITTED',
    stageName: 'Design Submitted',
    stageOrder: 3,
    autoSource: 'document_control:DESIGN_SUBMITTED',
    description: 'Design package submitted to client',
    color: '#f59e0b',
    icon: '📐',
    isMandatory: true,
  },
  {
    stageCode: 'DESIGN_APPROVED',
    stageName: 'Design Approved',
    stageOrder: 4,
    autoSource: 'document_control:DESIGN_APPROVED',
    description: 'Design package approved by client',
    color: '#10b981',
    icon: '✅',
    isMandatory: true,
  },
  {
    stageCode: 'SHOP_SUBMITTED',
    stageName: 'Shop Drawing Submitted',
    stageOrder: 5,
    autoSource: 'document_control:SHOP_SUBMITTED',
    description: 'Shop drawings submitted to client',
    color: '#f59e0b',
    icon: '📋',
    isMandatory: true,
  },
  {
    stageCode: 'SHOP_APPROVED',
    stageName: 'Shop Drawing Approved',
    stageOrder: 6,
    autoSource: 'document_control:SHOP_APPROVED',
    description: 'Shop drawings approved by client',
    color: '#10b981',
    icon: '✅',
    isMandatory: true,
  },
  {
    stageCode: 'PROCUREMENT_STARTED',
    stageName: 'Procurement Started',
    stageOrder: 7,
    autoSource: 'procurement:STARTED',
    description: 'Material procurement initiated',
    color: '#8b5cf6',
    icon: '🛒',
    isMandatory: true,
  },
  {
    stageCode: 'PRODUCTION_STARTED',
    stageName: 'Production Started',
    stageOrder: 8,
    autoSource: 'production:FIRST_LOG',
    description: 'Production/fabrication started (first production log)',
    color: '#f59e0b',
    icon: '🏭',
    isMandatory: true,
  },
  {
    stageCode: 'PRODUCTION_COMPLETED',
    stageName: 'Production Completed',
    stageOrder: 9,
    autoSource: 'production:COMPLETED',
    description: 'Production/fabrication completed',
    color: '#10b981',
    icon: '✅',
    isMandatory: true,
  },
  {
    stageCode: 'COATING_STARTED',
    stageName: 'Coating Started',
    stageOrder: 10,
    autoSource: 'coating:STARTED',
    description: 'Coating/galvanizing process started',
    color: '#f59e0b',
    icon: '🎨',
    isMandatory: false,
  },
  {
    stageCode: 'COATING_COMPLETED',
    stageName: 'Coating Completed',
    stageOrder: 11,
    autoSource: 'coating:COMPLETED',
    description: 'Coating/galvanizing process completed',
    color: '#10b981',
    icon: '✅',
    isMandatory: false,
  },
  {
    stageCode: 'DISPATCHING_STARTED',
    stageName: 'Dispatching Started',
    stageOrder: 12,
    autoSource: 'dispatching:STARTED',
    description: 'Dispatching/delivery started',
    color: '#f59e0b',
    icon: '🚚',
    isMandatory: true,
  },
  {
    stageCode: 'DISPATCHING_COMPLETED',
    stageName: 'Dispatching Completed',
    stageOrder: 13,
    autoSource: 'dispatching:COMPLETED',
    description: 'All materials dispatched to site',
    color: '#10b981',
    icon: '✅',
    isMandatory: true,
  },
  {
    stageCode: 'ERECTION_STARTED',
    stageName: 'Erection Started',
    stageOrder: 14,
    autoSource: 'erection:STARTED',
    description: 'On-site erection/installation started',
    color: '#f59e0b',
    icon: '🏗️',
    isMandatory: true,
  },
  {
    stageCode: 'ERECTION_COMPLETED',
    stageName: 'Erection Completed',
    stageOrder: 15,
    autoSource: 'erection:COMPLETED',
    description: 'On-site erection/installation completed',
    color: '#10b981',
    icon: '🎉',
    isMandatory: true,
  },
];

async function main() {
  console.log('🌱 Seeding operation stages...');

  // Delete existing stages
  await prisma.operationStageConfig.deleteMany({});
  console.log('✅ Cleared existing stages');

  // Create new stages
  for (const stage of OPERATION_STAGES) {
    await prisma.operationStageConfig.create({
      data: stage,
    });
    console.log(`✅ Created stage: ${stage.stageName}`);
  }

  console.log('🎉 Operation stages seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding operation stages:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
