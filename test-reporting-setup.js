/**
 * Test script to verify Hexa Reporting Engine setup
 */

console.log('🔍 Testing Hexa Reporting Engine Setup...\n');

// Test 1: Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  console.log('✅ Puppeteer installed');
} catch (e) {
  console.log('❌ Puppeteer NOT installed');
}

// Test 2: Check if handlebars is installed
try {
  require.resolve('handlebars');
  console.log('✅ Handlebars installed');
} catch (e) {
  console.log('❌ Handlebars NOT installed');
}

// Test 3: Check if output directory exists
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'public', 'outputs', 'reports');
if (fs.existsSync(outputDir)) {
  console.log('✅ Output directory exists:', outputDir);
} else {
  console.log('❌ Output directory NOT found');
}

// Test 4: Check if fonts directory exists
const fontsDir = path.join(__dirname, 'src', 'modules', 'reporting', 'fonts');
if (fs.existsSync(fontsDir)) {
  console.log('✅ Fonts directory exists:', fontsDir);
} else {
  console.log('❌ Fonts directory NOT found');
}

// Test 5: Check if template files exist
const templateDir = path.join(__dirname, 'src', 'modules', 'reporting', 'templates');
if (fs.existsSync(templateDir)) {
  console.log('✅ Templates directory exists');
  
  const globalCSS = path.join(templateDir, 'global.css');
  if (fs.existsSync(globalCSS)) {
    console.log('✅ global.css found');
  }
  
  const projectSummaryDir = path.join(templateDir, 'project-summary');
  if (fs.existsSync(projectSummaryDir)) {
    console.log('✅ project-summary template found');
  }
} else {
  console.log('❌ Templates directory NOT found');
}

// Test 6: Check if module files exist
const reportEngine = path.join(__dirname, 'src', 'modules', 'reporting', 'reportEngine.ts');
if (fs.existsSync(reportEngine)) {
  console.log('✅ reportEngine.ts found');
} else {
  console.log('❌ reportEngine.ts NOT found');
}

const reportController = path.join(__dirname, 'src', 'modules', 'reporting', 'reportController.ts');
if (fs.existsSync(reportController)) {
  console.log('✅ reportController.ts found');
} else {
  console.log('❌ reportController.ts NOT found');
}

// Test 7: Check if API routes exist
const generateRoute = path.join(__dirname, 'src', 'app', 'api', 'reports', 'generate', 'route.ts');
if (fs.existsSync(generateRoute)) {
  console.log('✅ /api/reports/generate route found');
} else {
  console.log('❌ /api/reports/generate route NOT found');
}

console.log('\n📊 Setup Test Complete!\n');
console.log('Next steps:');
console.log('1. Restart your dev server: npm run dev');
console.log('2. Test the API: POST http://localhost:3000/api/reports/generate');
console.log('3. Add fonts (optional): src/modules/reporting/fonts/');
console.log('\nDocumentation: HEXA_REPORTING_ENGINE_SETUP.md');
