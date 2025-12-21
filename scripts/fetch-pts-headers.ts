/**
 * Script to fetch PTS sheet headers
 * Run with: npx ts-node scripts/fetch-pts-headers.ts
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '11jXnWje2-4n9FPUB1jsJrkP6ioooKgnoYVkwVGG4hPI';
const RAW_DATA_SHEET = '02-Raw Data';
const LOG_SHEET = '04-Log';

async function main() {
  try {
    // Parse service account key
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set');
    }

    const credentials = JSON.parse(keyJson);
    
    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch Raw Data headers (first 2 rows to see structure)
    console.log('\n=== RAW DATA SHEET (02-Raw Data) ===\n');
    const rawDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${RAW_DATA_SHEET}'!A1:Z3`,
    });
    
    const rawDataRows = rawDataResponse.data.values || [];
    rawDataRows.forEach((row, i) => {
      console.log(`Row ${i + 1}:`, row.map((cell, j) => `${String.fromCharCode(65 + j)}=${cell}`).join(' | '));
    });

    // Fetch Log headers (first 2 rows)
    console.log('\n=== LOG SHEET (04-Log) ===\n');
    const logResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${LOG_SHEET}'!A1:Z3`,
    });
    
    const logRows = logResponse.data.values || [];
    logRows.forEach((row, i) => {
      console.log(`Row ${i + 1}:`, row.map((cell, j) => `${String.fromCharCode(65 + j)}=${cell}`).join(' | '));
    });

    // Get row counts
    console.log('\n=== ROW COUNTS ===\n');
    
    const rawCountResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${RAW_DATA_SHEET}'!A:A`,
    });
    console.log(`Raw Data rows: ${rawCountResponse.data.values?.length || 0}`);

    const logCountResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${LOG_SHEET}'!A:A`,
    });
    console.log(`Log rows: ${logCountResponse.data.values?.length || 0}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
