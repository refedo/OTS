/**
 * KPI System Initialization
 * 
 * This file should be imported in your main server file to start the KPI scheduler
 */

import { startKPIScheduler } from './scheduler';

let initialized = false;

export function initializeKPISystem() {
  if (initialized) {
    console.log('⚠️  KPI System already initialized');
    return;
  }

  console.log('\n🎯 Initializing KPI System...');
  
  try {
    // Start the scheduler
    startKPIScheduler();
    
    initialized = true;
    console.log('✅ KPI System initialized successfully\n');
  } catch (error) {
    console.error('❌ Failed to initialize KPI System:', error);
    throw error;
  }
}

// Auto-initialize if in production
if (process.env.NODE_ENV === 'production') {
  initializeKPISystem();
}
