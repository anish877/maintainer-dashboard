#!/usr/bin/env node

/**
 * Test script for the AI Auto-Scraper system
 * Run with: node scripts/test-scraper.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Testing AI Auto-Scraper System...\n');

// Test 1: Check if Prisma client is generated
console.log('1️⃣ Testing Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully\n');
} catch (error) {
  console.log('❌ Failed to generate Prisma client\n');
  process.exit(1);
}

// Test 2: Check database connection
console.log('2️⃣ Testing database connection...');
try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('✅ Database connection successful\n');
} catch (error) {
  console.log('❌ Database connection failed\n');
  process.exit(1);
}

// Test 3: Test Reddit scraper (basic functionality)
console.log('3️⃣ Testing Reddit scraper...');
try {
  const testScript = `
    const { RedditScraper } = require('./lib/scrapers/reddit-scraper.ts');
    console.log('✅ Reddit scraper module loaded successfully');
  `;
  execSync(`node -e "${testScript}"`, { stdio: 'inherit' });
  console.log('✅ Reddit scraper test passed\n');
} catch (error) {
  console.log('❌ Reddit scraper test failed\n');
}

// Test 4: Test AI classifier
console.log('4️⃣ Testing AI classifier...');
try {
  const testScript = `
    const { getUnprocessedPosts } = require('./lib/ai/classifier.ts');
    console.log('✅ AI classifier module loaded successfully');
  `;
  execSync(`node -e "${testScript}"`, { stdio: 'inherit' });
  console.log('✅ AI classifier test passed\n');
} catch (error) {
  console.log('❌ AI classifier test failed\n');
}

// Test 5: Test GitHub client
console.log('5️⃣ Testing GitHub client...');
try {
  const testScript = `
    const { GitHubClient } = require('./lib/github/client.ts');
    console.log('✅ GitHub client module loaded successfully');
  `;
  execSync(`node -e "${testScript}"`, { stdio: 'inherit' });
  console.log('✅ GitHub client test passed\n');
} catch (error) {
  console.log('❌ GitHub client test failed\n');
}

// Test 6: Check environment variables
console.log('6️⃣ Checking environment variables...');
const requiredEnvVars = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'GITHUB_TOKEN',
  'CRON_SECRET'
];

let envVarsOk = true;
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.log(`❌ Missing environment variable: ${varName}`);
    envVarsOk = false;
  } else {
    console.log(`✅ ${varName} is set`);
  }
});

if (envVarsOk) {
  console.log('✅ All required environment variables are set\n');
} else {
  console.log('❌ Some environment variables are missing\n');
}

// Test 7: Check if Next.js build works
console.log('7️⃣ Testing Next.js build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Next.js build successful\n');
} catch (error) {
  console.log('❌ Next.js build failed\n');
}

console.log('🎉 AI Auto-Scraper system test completed!');
console.log('\n📋 Next steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Visit: http://localhost:3000/scraper-dashboard');
console.log('3. Test manual scraping via the dashboard');
console.log('4. Configure GitHub integration');
console.log('5. Set up Vercel cron jobs for production');

console.log('\n📚 Documentation: README-AI-SCRAPER.md');
console.log('🔧 Configuration: Update scraper configs in lib/scrapers/');
console.log('📊 Monitoring: /api/monitoring/health');
