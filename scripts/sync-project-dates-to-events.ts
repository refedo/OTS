import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncProjectDatesToEvents() {
  console.log('🔄 Syncing project dates to operation events...\n');

  try {
    // Get all projects with contract or down payment dates
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { contractDate: { not: null } },
          { downPaymentDate: { not: null } },
        ],
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        contractDate: true,
        downPaymentDate: true,
      },
    });

    console.log(`Found ${projects.length} projects with contract/payment dates\n`);

    let contractEventsCreated = 0;
    let downPaymentEventsCreated = 0;
    let skipped = 0;

    for (const project of projects) {
      console.log(`Processing: ${project.projectNumber} - ${project.name}`);

      // Create CONTRACT_SIGNED event if contractDate exists
      if (project.contractDate) {
        const existingContract = await prisma.operationEvent.findFirst({
          where: {
            projectId: project.id,
            stage: 'CONTRACT_SIGNED',
          },
        });

        if (!existingContract) {
          await prisma.operationEvent.create({
            data: {
              projectId: project.id,
              stage: 'CONTRACT_SIGNED',
              eventDate: project.contractDate,
              status: 'Completed',
              eventSource: 'system_sync',
              description: 'Auto-synced from project contract date',
            },
          });
          console.log('  ✅ Created CONTRACT_SIGNED event');
          contractEventsCreated++;
        } else {
          console.log('  ⏭️  CONTRACT_SIGNED event already exists');
          skipped++;
        }
      }

      // Create DOWN_PAYMENT_RECEIVED event if downPaymentDate exists
      if (project.downPaymentDate) {
        const existingDownPayment = await prisma.operationEvent.findFirst({
          where: {
            projectId: project.id,
            stage: 'DOWN_PAYMENT_RECEIVED',
          },
        });

        if (!existingDownPayment) {
          await prisma.operationEvent.create({
            data: {
              projectId: project.id,
              stage: 'DOWN_PAYMENT_RECEIVED',
              eventDate: project.downPaymentDate,
              status: 'Completed',
              eventSource: 'system_sync',
              description: 'Auto-synced from project down payment date',
            },
          });
          console.log('  ✅ Created DOWN_PAYMENT_RECEIVED event');
          downPaymentEventsCreated++;
        } else {
          console.log('  ⏭️  DOWN_PAYMENT_RECEIVED event already exists');
          skipped++;
        }
      }

      console.log('');
    }

    console.log('\n📊 Summary:');
    console.log(`  CONTRACT_SIGNED events created: ${contractEventsCreated}`);
    console.log(`  DOWN_PAYMENT_RECEIVED events created: ${downPaymentEventsCreated}`);
    console.log(`  Skipped (already exists): ${skipped}`);
    console.log('\n✅ Sync completed successfully!');
  } catch (error) {
    console.error('❌ Error syncing project dates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

syncProjectDatesToEvents();
