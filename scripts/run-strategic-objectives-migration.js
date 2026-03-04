const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('Starting migration...\n');
    
    // Execute statements one by one with proper error handling
    const statements = [
      {
        name: 'Create strategic_objectives table',
        sql: `CREATE TABLE IF NOT EXISTS \`strategic_objectives\` (
          \`id\` CHAR(36) NOT NULL,
          \`title\` VARCHAR(255) NOT NULL,
          \`description\` TEXT,
          \`category\` VARCHAR(100) NOT NULL,
          \`startYear\` INT NOT NULL,
          \`endYear\` INT NOT NULL,
          \`ownerId\` CHAR(36) NOT NULL,
          \`priority\` VARCHAR(50) NOT NULL DEFAULT 'Medium',
          \`status\` VARCHAR(50) NOT NULL DEFAULT 'Not Started',
          \`progress\` FLOAT NOT NULL DEFAULT 0,
          \`targetOutcome\` TEXT,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          INDEX \`strategic_objectives_startYear_idx\` (\`startYear\`),
          INDEX \`strategic_objectives_endYear_idx\` (\`endYear\`),
          INDEX \`strategic_objectives_ownerId_idx\` (\`ownerId\`),
          INDEX \`strategic_objectives_category_idx\` (\`category\`),
          INDEX \`strategic_objectives_status_idx\` (\`status\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      },
      {
        name: 'Add strategicObjectiveId column to company_objectives',
        sql: `ALTER TABLE \`company_objectives\` ADD COLUMN \`strategicObjectiveId\` CHAR(36) NULL AFTER \`year\``
      },
      {
        name: 'Add index on strategicObjectiveId',
        sql: `ALTER TABLE \`company_objectives\` ADD INDEX \`company_objectives_strategicObjectiveId_idx\` (\`strategicObjectiveId\`)`
      },
      {
        name: 'Add foreign key for strategicObjectiveId',
        sql: `ALTER TABLE \`company_objectives\` ADD CONSTRAINT \`company_objectives_strategicObjectiveId_fkey\` FOREIGN KEY (\`strategicObjectiveId\`) REFERENCES \`strategic_objectives\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`
      },
      {
        name: 'Make objectiveId nullable in annual_initiatives',
        sql: `ALTER TABLE \`annual_initiatives\` MODIFY COLUMN \`objectiveId\` CHAR(36) NULL`
      },
      {
        name: 'Drop old foreign key constraint',
        sql: `ALTER TABLE \`annual_initiatives\` DROP FOREIGN KEY \`annual_initiatives_objectiveId_fkey\``
      },
      {
        name: 'Add new foreign key with SET NULL',
        sql: `ALTER TABLE \`annual_initiatives\` ADD CONSTRAINT \`annual_initiatives_objectiveId_fkey\` FOREIGN KEY (\`objectiveId\`) REFERENCES \`company_objectives\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`
      },
      {
        name: 'Create initiative_objectives junction table',
        sql: `CREATE TABLE IF NOT EXISTS \`initiative_objectives\` (
          \`id\` CHAR(36) NOT NULL,
          \`initiativeId\` CHAR(36) NOT NULL,
          \`objectiveId\` CHAR(36) NOT NULL,
          \`isPrimary\` TINYINT(1) NOT NULL DEFAULT 0,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`initiative_objectives_initiativeId_objectiveId_key\` (\`initiativeId\`, \`objectiveId\`),
          INDEX \`initiative_objectives_initiativeId_idx\` (\`initiativeId\`),
          INDEX \`initiative_objectives_objectiveId_idx\` (\`objectiveId\`),
          CONSTRAINT \`initiative_objectives_initiativeId_fkey\` FOREIGN KEY (\`initiativeId\`) REFERENCES \`annual_initiatives\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT \`initiative_objectives_objectiveId_fkey\` FOREIGN KEY (\`objectiveId\`) REFERENCES \`company_objectives\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      },
      {
        name: 'Migrate existing relationships',
        sql: `INSERT INTO \`initiative_objectives\` (\`id\`, \`initiativeId\`, \`objectiveId\`, \`isPrimary\`, \`createdAt\`)
        SELECT UUID(), \`id\`, \`objectiveId\`, 1, NOW()
        FROM \`annual_initiatives\`
        WHERE \`objectiveId\` IS NOT NULL
        ON DUPLICATE KEY UPDATE \`isPrimary\` = 1`
      }
    ];
    
    for (let i = 0; i < statements.length; i++) {
      const { name, sql } = statements[i];
      console.log(`[${i + 1}/${statements.length}] ${name}...`);
      
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log('  ✓ Success\n');
      } catch (error) {
        // Some errors are expected
        if (error.message.includes('Duplicate column') || 
            error.message.includes('already exists') ||
            error.message.includes('Duplicate key name') ||
            error.message.includes("Can't DROP")) {
          console.log('  ⚠ Already exists (skipped)\n');
        } else {
          console.error('  ✗ Error:', error.message);
          throw error;
        }
      }
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nNow run: npx prisma generate');
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
