const mysql = require('mysql2/promise');
require('dotenv').config();

const stages = [
  { code: 'CONTRACT_SIGNED', name: 'Signing Contract', order: 1, source: null, desc: 'Contract signed with client', color: '#3b82f6', icon: '📝', mandatory: 1 },
  { code: 'DOWN_PAYMENT_RECEIVED', name: 'Down Payment Receiving', order: 2, source: null, desc: 'Down payment received from client', color: '#10b981', icon: '💰', mandatory: 1 },
  { code: 'DESIGN_SUBMITTED', name: 'Design Submitted', order: 3, source: 'document_control:DESIGN_SUBMITTED', desc: 'Design package submitted to client', color: '#f59e0b', icon: '📐', mandatory: 1 },
  { code: 'DESIGN_APPROVED', name: 'Design Approved', order: 4, source: 'document_control:DESIGN_APPROVED', desc: 'Design package approved by client', color: '#10b981', icon: '✅', mandatory: 1 },
  { code: 'SHOP_SUBMITTED', name: 'Shop Drawing Submitted', order: 5, source: 'document_control:SHOP_SUBMITTED', desc: 'Shop drawings submitted to client', color: '#f59e0b', icon: '📋', mandatory: 1 },
  { code: 'SHOP_APPROVED', name: 'Shop Drawing Approved', order: 6, source: 'document_control:SHOP_APPROVED', desc: 'Shop drawings approved by client', color: '#10b981', icon: '✅', mandatory: 1 },
  { code: 'PROCUREMENT_STARTED', name: 'Procurement Started', order: 7, source: 'procurement:STARTED', desc: 'Material procurement initiated', color: '#8b5cf6', icon: '🛒', mandatory: 1 },
  { code: 'PRODUCTION_STARTED', name: 'Production Started', order: 8, source: 'production:FIRST_LOG', desc: 'Production/fabrication started (first production log)', color: '#f59e0b', icon: '🏭', mandatory: 1 },
  { code: 'PRODUCTION_COMPLETED', name: 'Production Completed', order: 9, source: 'production:COMPLETED', desc: 'Production/fabrication completed', color: '#10b981', icon: '✅', mandatory: 1 },
  { code: 'COATING_STARTED', name: 'Coating Started', order: 10, source: 'coating:STARTED', desc: 'Coating/galvanizing process started', color: '#f59e0b', icon: '🎨', mandatory: 0 },
  { code: 'COATING_COMPLETED', name: 'Coating Completed', order: 11, source: 'coating:COMPLETED', desc: 'Coating/galvanizing process completed', color: '#10b981', icon: '✅', mandatory: 0 },
  { code: 'DISPATCHING_STARTED', name: 'Dispatching Started', order: 12, source: 'dispatching:STARTED', desc: 'Dispatching/delivery started', color: '#f59e0b', icon: '🚚', mandatory: 1 },
  { code: 'DISPATCHING_COMPLETED', name: 'Dispatching Completed', order: 13, source: 'dispatching:COMPLETED', desc: 'All materials dispatched to site', color: '#10b981', icon: '✅', mandatory: 1 },
  { code: 'ERECTION_STARTED', name: 'Erection Started', order: 14, source: 'erection:STARTED', desc: 'On-site erection/installation started', color: '#f59e0b', icon: '🏗️', mandatory: 1 },
  { code: 'ERECTION_COMPLETED', name: 'Erection Completed', order: 15, source: 'erection:COMPLETED', desc: 'On-site erection/installation completed', color: '#10b981', icon: '🎉', mandatory: 1 },
];

async function seedStages() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('🗑️  Clearing existing stages...');
    await connection.execute('DELETE FROM operationstageconfig');
    
    console.log('🌱 Inserting new stages...');
    for (const stage of stages) {
      await connection.execute(
        `INSERT INTO operationstageconfig 
        (id, stageCode, stageName, orderIndex, autoSource, description, color, icon, isMandatory, createdAt, updatedAt) 
        VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [stage.code, stage.name, stage.order, stage.source, stage.desc, stage.color, stage.icon, stage.mandatory]
      );
      console.log(`  ✅ ${stage.name}`);
    }
    
    console.log('\n🎉 Successfully seeded 15 operation stages!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedStages();
