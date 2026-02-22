/**
 * Test script to check Dolibarr API invoice fetching
 */

const https = require('https');

const DOLIBARR_API_URL = 'https://www.hexametals.com/erp/api/index.php';
const DOLIBARR_API_KEY = 'pKY1pUzQO6gXP1882nvS1M75d2lrRvxN';

async function makeRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${DOLIBARR_API_URL}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const options = {
      method: 'GET',
      headers: {
        'DOLAPIKEY': DOLIBARR_API_KEY,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testDolibarrAPI() {
  console.log('=== Testing Dolibarr API Connection ===\n');

  // Test 1: Check status
  console.log('1. Testing API status...');
  try {
    const status = await makeRequest('status');
    console.log(`   Status: ${status.status}`);
    console.log(`   Response:`, JSON.stringify(status.data, null, 2).slice(0, 200));
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }

  // Test 2: Fetch bank accounts
  console.log('\n2. Fetching bank accounts...');
  try {
    const banks = await makeRequest('bankaccounts', { limit: 5 });
    console.log(`   Status: ${banks.status}`);
    console.log(`   Count: ${Array.isArray(banks.data) ? banks.data.length : 'N/A'}`);
    if (Array.isArray(banks.data) && banks.data.length > 0) {
      console.log(`   First bank: ${banks.data[0].label || banks.data[0].ref}`);
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }

  // Test 3: Fetch customer invoices
  console.log('\n3. Fetching customer invoices...');
  try {
    const invoices = await makeRequest('invoices', { 
      limit: 5,
      sortfield: 't.rowid',
      sortorder: 'DESC'
    });
    console.log(`   Status: ${invoices.status}`);
    if (invoices.status === 200) {
      console.log(`   Count: ${Array.isArray(invoices.data) ? invoices.data.length : 'N/A'}`);
      if (Array.isArray(invoices.data) && invoices.data.length > 0) {
        console.log(`   First invoice ref: ${invoices.data[0].ref}`);
        console.log(`   First invoice status: ${invoices.data[0].statut || invoices.data[0].status}`);
        console.log(`   First invoice total: ${invoices.data[0].total_ttc}`);
      }
    } else {
      console.log(`   Response:`, JSON.stringify(invoices.data, null, 2).slice(0, 500));
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }

  // Test 4: Fetch supplier invoices
  console.log('\n4. Fetching supplier invoices...');
  try {
    const supplierInvoices = await makeRequest('supplierinvoices', { 
      limit: 5,
      sortfield: 't.rowid',
      sortorder: 'DESC'
    });
    console.log(`   Status: ${supplierInvoices.status}`);
    if (supplierInvoices.status === 200) {
      console.log(`   Count: ${Array.isArray(supplierInvoices.data) ? supplierInvoices.data.length : 'N/A'}`);
      if (Array.isArray(supplierInvoices.data) && supplierInvoices.data.length > 0) {
        console.log(`   First invoice ref: ${supplierInvoices.data[0].ref}`);
      }
    } else {
      console.log(`   Response:`, JSON.stringify(supplierInvoices.data, null, 2).slice(0, 500));
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }

  console.log('\n=== Test Complete ===');
}

testDolibarrAPI();
