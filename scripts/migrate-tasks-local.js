const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('Running task module migrations...');
    
    // Add requesterId column
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`Task\` ADD COLUMN \`requesterId\` CHAR(36) NULL`);
      console.log('✓ Added requesterId column');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('- requesterId column already exists');
      } else throw e;
    }
    
    // Add releaseDate column
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`Task\` ADD COLUMN \`releaseDate\` DATETIME(3) NULL`);
      console.log('✓ Added releaseDate column');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('- releaseDate column already exists');
      } else throw e;
    }
    
    // Add foreign key
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`Task\` 
        ADD CONSTRAINT \`Task_requesterId_fkey\` 
        FOREIGN KEY (\`requesterId\`) REFERENCES \`User\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('✓ Added foreign key constraint');
    } catch (e) {
      if (e.message.includes('Duplicate')) {
        console.log('- Foreign key constraint already exists');
      } else throw e;
    }
    
    // Create index
    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX \`Task_requesterId_idx\` ON \`Task\`(\`requesterId\`)`);
      console.log('✓ Created index');
    } catch (e) {
      if (e.message.includes('Duplicate')) {
        console.log('- Index already exists');
      } else throw e;
    }
    
    // Update notification type enum
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`notifications\` 
      MODIFY COLUMN \`type\` ENUM('TASK_ASSIGNED', 'TASK_COMPLETED', 'APPROVAL_REQUIRED', 'DEADLINE_WARNING', 'APPROVED', 'REJECTED', 'SYSTEM') NOT NULL
    `);
    console.log('✓ Updated notification type enum');

    // Create fin_salaries table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS fin_salaries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dolibarr_id INT NOT NULL,
        ref VARCHAR(100) NULL,
        label VARCHAR(500) NULL,
        fk_user INT NULL,
        user_name VARCHAR(255) NULL,
        amount DECIMAL(20,4) NOT NULL DEFAULT 0,
        salary DECIMAL(20,4) NOT NULL DEFAULT 0,
        date_start DATE NULL,
        date_end DATE NULL,
        date_payment DATE NULL,
        is_paid TINYINT(1) NOT NULL DEFAULT 0,
        fk_bank_account INT NULL,
        first_synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        sync_hash VARCHAR(64) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        UNIQUE KEY uk_dolibarr_id (dolibarr_id),
        KEY idx_date_start (date_start),
        KEY idx_fk_user (fk_user)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Created fin_salaries table');

    // Add salary config and CoA
    try {
      await prisma.$executeRawUnsafe(
        "INSERT IGNORE INTO fin_config (config_key, config_value, description) VALUES ('default_salary_account', '631000', 'Default account code for salary expenses')"
      );
      console.log('✓ Added salary config');
    } catch (e) { console.log('- Salary config already exists'); }

    try {
      await prisma.$executeRawUnsafe(
        "INSERT IGNORE INTO fin_chart_of_accounts (account_code, account_name, account_type, parent_code, is_active) VALUES ('631000', 'Salaries & Wages', 'expense', '600000', 1)"
      );
      console.log('✓ Added salary CoA entry');
    } catch (e) { console.log('- Salary CoA entry already exists'); }
    
    console.log('\n✓ All migrations completed successfully');
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
