const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding division column to ScopeSchedule...');
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE ScopeSchedule 
        ADD COLUMN division VARCHAR(191) NULL
      `;
      console.log('Column added successfully');
    } catch (error) {
      if (error.code === 'P2010' && error.meta?.message?.includes('Duplicate column')) {
        console.log('Column already exists, skipping...');
      } else {
        throw error;
      }
    }
    
    console.log('Updating existing records with division...');
    
    await prisma.$executeRaw`
      UPDATE ScopeSchedule 
      SET division = CASE 
        WHEN scopeType IN ('design', 'shopDrawing') THEN 'Engineering'
        WHEN scopeType IN ('procurement', 'fabrication', 'galvanization', 'painting', 'delivery') THEN 'Operations'
        WHEN scopeType = 'erection' THEN 'Site'
        ELSE 'Operations'
      END
      WHERE division IS NULL
    `;
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
