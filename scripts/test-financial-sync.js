/**
 * Test the financial sync service directly
 */

const { createDolibarrClient } = require('../src/lib/dolibarr/dolibarr-client');

async function testSync() {
  console.log('=== Testing Financial Sync ===\n');

  try {
    const client = createDolibarrClient();
    
    // Test bank accounts
    console.log('1. Fetching bank accounts...');
    const banks = await client.getBankAccounts();
    console.log(`   Found ${banks.length} bank accounts`);
    
    // Test customer invoices
    console.log('\n2. Fetching customer invoices...');
    const invoices = await client.getAllInvoices(100);
    console.log(`   Found ${invoices.length} customer invoices`);
    if (invoices.length > 0) {
      console.log(`   Sample: ${invoices[0].ref} - ${invoices[0].total_ttc} SAR`);
    }
    
    // Test supplier invoices
    console.log('\n3. Fetching supplier invoices...');
    const supplierInvoices = await client.getAllSupplierInvoices(100);
    console.log(`   Found ${supplierInvoices.length} supplier invoices`);
    if (supplierInvoices.length > 0) {
      console.log(`   Sample: ${supplierInvoices[0].ref} - ${supplierInvoices[0].total_ttc} SAR`);
    }
    
    console.log('\n=== All API calls successful ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSync();
