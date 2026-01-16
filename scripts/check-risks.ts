import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRisks() {
  try {
    const risks = await prisma.riskEvent.findMany({
      where: { resolvedAt: null }
    });
    
    console.log('Active risks:', risks.length);
    console.log('\nBreakdown by severity:');
    const bySeverity = risks.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(bySeverity);
    
    console.log('\nRisk details:');
    risks.forEach(r => {
      console.log(`- ${r.severity}: ${r.type} (${r.title})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRisks();
