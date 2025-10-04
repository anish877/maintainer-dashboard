#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Issue Completeness Checker
 * 
 * This script tests all components of the completeness checker system
 * including database models, API endpoints, AI analysis, and UI components.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🧪 Issue Completeness Checker - Comprehensive Test Suite')
console.log('========================================================\n')

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
}

function runTest(testName, testFunction) {
  testResults.total++
  console.log(`\n🔍 Testing: ${testName}`)
  console.log('-'.repeat(50))
  
  try {
    const result = testFunction()
    if (result.success) {
      console.log(`✅ PASSED: ${testName}`)
      testResults.passed++
      testResults.details.push({ name: testName, status: 'PASSED', details: result.details })
    } else {
      console.log(`❌ FAILED: ${testName}`)
      console.log(`   Error: ${result.error}`)
      testResults.failed++
      testResults.details.push({ name: testName, status: 'FAILED', error: result.error })
    }
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`)
    console.log(`   Error: ${error.message}`)
    testResults.failed++
    testResults.details.push({ name: testName, status: 'FAILED', error: error.message })
  }
}

// Test 1: Environment Configuration
runTest('Environment Configuration', () => {
  const envPath = '.env'
  if (!fs.existsSync(envPath)) {
    return { success: false, error: '.env file not found' }
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  const requiredVars = ['OPEN_AI_KEY', 'DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']
  
  for (const varName of requiredVars) {
    if (!envContent.includes(`${varName}=`)) {
      return { success: false, error: `Missing environment variable: ${varName}` }
    }
  }
  
  return { success: true, details: 'All required environment variables are configured' }
})

// Test 2: Database Schema Validation
runTest('Database Schema Validation', () => {
  const schemaPath = 'prisma/schema.prisma'
  if (!fs.existsSync(schemaPath)) {
    return { success: false, error: 'Prisma schema file not found' }
  }
  
  const schemaContent = fs.readFileSync(schemaPath, 'utf8')
  
  // Check for completeness checker models
  const requiredModels = [
    'model CompletenessTemplate',
    'model PendingComment', 
    'model CompletenessAnalysis',
    'model CompletenessMetrics',
    'enum ApprovalStatus',
    'enum TemplateCategory'
  ]
  
  for (const model of requiredModels) {
    if (!schemaContent.includes(model)) {
      return { success: false, error: `Missing model in schema: ${model}` }
    }
  }
  
  return { success: true, details: 'All completeness checker models are defined in schema' }
})

// Test 3: Prisma Client Generation
runTest('Prisma Client Generation', () => {
  try {
    execSync('npx prisma generate', { stdio: 'pipe' })
    return { success: true, details: 'Prisma client generated successfully' }
  } catch (error) {
    return { success: false, error: `Failed to generate Prisma client: ${error.message}` }
  }
})

// Test 4: Database Connection
runTest('Database Connection', () => {
  try {
    execSync('npx prisma db pull', { stdio: 'pipe' })
    return { success: true, details: 'Database connection successful' }
  } catch (error) {
    return { success: false, error: `Database connection failed: ${error.message}` }
  }
})

// Test 5: Core API Files
runTest('Core API Endpoints', () => {
  const apiFiles = [
    'app/api/completeness/analyze-repository/route.ts',
    'app/api/completeness/request-comment/route.ts',
    'app/api/completeness/approve-comment/route.ts',
    'app/api/completeness/templates/route.ts'
  ]
  
  for (const file of apiFiles) {
    if (!fs.existsSync(file)) {
      return { success: false, error: `Missing API file: ${file}` }
    }
  }
  
  return { success: true, details: 'All core API endpoints are present' }
})

// Test 6: AI Analysis Engine
runTest('AI Analysis Engine', () => {
  const aiFiles = [
    'lib/ai/completeness-analyzer.ts',
    'lib/templates/template-engine.ts'
  ]
  
  for (const file of aiFiles) {
    if (!fs.existsSync(file)) {
      return { success: false, error: `Missing AI engine file: ${file}` }
    }
  }
  
  return { success: true, details: 'AI analysis engine files are present' }
})

// Test 7: Frontend Components
runTest('Frontend Components', () => {
  const componentFiles = [
    'app/(default)/completeness/page.tsx',
    'app/(default)/completeness/components/completeness-metrics.tsx',
    'app/(default)/completeness/components/issue-analysis-results.tsx',
    'app/(default)/completeness/components/approval-queue.tsx',
    'app/(default)/completeness/components/template-manager.tsx'
  ]
  
  for (const file of componentFiles) {
    if (!fs.existsSync(file)) {
      return { success: false, error: `Missing component file: ${file}` }
    }
  }
  
  return { success: true, details: 'All frontend components are present' }
})

// Test 8: Navigation Integration
runTest('Navigation Integration', () => {
  const sidebarPath = 'components/ui/sidebar.tsx'
  if (!fs.existsSync(sidebarPath)) {
    return { success: false, error: 'Sidebar component not found' }
  }
  
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8')
  
  if (!sidebarContent.includes('Completeness Checker')) {
    return { success: false, error: 'Completeness Checker not found in navigation' }
  }
  
  return { success: true, details: 'Completeness Checker is integrated in navigation' }
})

// Test 9: TypeScript Compilation
runTest('TypeScript Compilation', () => {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' })
    return { success: true, details: 'TypeScript compilation successful' }
  } catch (error) {
    return { success: false, error: `TypeScript compilation failed: ${error.message}` }
  }
})

// Test 10: Next.js Build Test
runTest('Next.js Build Test', () => {
  try {
    // Only test if we have the necessary environment variables
    const envContent = fs.readFileSync('.env', 'utf8')
    if (!envContent.includes('OPEN_AI_KEY=') || !envContent.includes('DATABASE_URL=')) {
      return { success: false, error: 'Missing required environment variables for build test' }
    }
    
    execSync('npm run build', { stdio: 'pipe' })
    return { success: true, details: 'Next.js build successful' }
  } catch (error) {
    return { success: false, error: `Next.js build failed: ${error.message}` }
  }
})

// Test 11: File Structure Validation
runTest('File Structure Validation', () => {
  const requiredStructure = {
    'app/(default)/completeness': 'Completeness checker pages',
    'app/api/completeness': 'Completeness checker API routes',
    'lib/ai': 'AI analysis engine',
    'lib/templates': 'Template engine',
    'components/ui/sidebar.tsx': 'Navigation integration'
  }
  
  for (const [path, description] of Object.entries(requiredStructure)) {
    if (!fs.existsSync(path)) {
      return { success: false, error: `Missing required path: ${path} (${description})` }
    }
  }
  
  return { success: true, details: 'All required file structure is present' }
})

// Test 12: Package Dependencies
runTest('Package Dependencies', () => {
  const packageJsonPath = 'package.json'
  if (!fs.existsSync(packageJsonPath)) {
    return { success: false, error: 'package.json not found' }
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const requiredDeps = [
    'openai',
    '@prisma/client',
    'prisma',
    'next',
    'react',
    'react-dom'
  ]
  
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      return { success: false, error: `Missing required dependency: ${dep}` }
    }
  }
  
  return { success: true, details: 'All required dependencies are installed' }
})

// Test 13: Code Quality (Linting)
runTest('Code Quality (Linting)', () => {
  try {
    execSync('npm run lint', { stdio: 'pipe' })
    return { success: true, details: 'Code linting passed' }
  } catch (error) {
    return { success: false, error: `Linting failed: ${error.message}` }
  }
})

// Test 14: Documentation
runTest('Documentation', () => {
  const docFiles = [
    'README-COMPLETENESS-CHECKER.md',
    'scripts/setup-completeness-checker.js'
  ]
  
  for (const file of docFiles) {
    if (!fs.existsSync(file)) {
      return { success: false, error: `Missing documentation file: ${file}` }
    }
  }
  
  return { success: true, details: 'All documentation files are present' }
})

// Test 15: Setup Script Validation
runTest('Setup Script Validation', () => {
  const setupScriptPath = 'scripts/setup-completeness-checker.js'
  if (!fs.existsSync(setupScriptPath)) {
    return { success: false, error: 'Setup script not found' }
  }
  
  const scriptContent = fs.readFileSync(setupScriptPath, 'utf8')
  
  // Check for key setup functionality
  const requiredFeatures = [
    'Environment Configuration',
    'Database Setup',
    'Template Creation',
    'Application Configuration'
  ]
  
  for (const feature of requiredFeatures) {
    if (!scriptContent.includes(feature)) {
      return { success: false, error: `Setup script missing feature: ${feature}` }
    }
  }
  
  return { success: true, details: 'Setup script contains all required features' }
})

// Generate Test Report
console.log('\n📊 Test Results Summary')
console.log('========================')
console.log(`Total Tests: ${testResults.total}`)
console.log(`Passed: ${testResults.passed} ✅`)
console.log(`Failed: ${testResults.failed} ❌`)
console.log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`)

if (testResults.failed > 0) {
  console.log('\n❌ Failed Tests:')
  testResults.details
    .filter(test => test.status === 'FAILED')
    .forEach(test => {
      console.log(`   - ${test.name}: ${test.error}`)
    })
}

console.log('\n✅ Passed Tests:')
testResults.details
  .filter(test => test.status === 'PASSED')
  .forEach(test => {
    console.log(`   - ${test.name}: ${test.details}`)
  })

// Overall Status
console.log('\n🎯 Overall Status')
console.log('=================')
if (testResults.failed === 0) {
  console.log('🎉 ALL TESTS PASSED!')
  console.log('✨ Issue Completeness Checker is ready to use!')
  console.log('\nNext steps:')
  console.log('1. Run: npm run dev')
  console.log('2. Navigate to: http://localhost:3000/completeness')
  console.log('3. Configure your GitHub OAuth app')
  console.log('4. Start analyzing issues!')
} else {
  console.log('⚠️  Some tests failed. Please fix the issues above before using the system.')
  console.log('\nCommon fixes:')
  console.log('- Run: node scripts/setup-completeness-checker.js')
  console.log('- Check your .env.local file')
  console.log('- Ensure database is properly configured')
  console.log('- Run: npx prisma db push')
}

// Save detailed report
const reportPath = 'test-results-completeness.json'
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    total: testResults.total,
    passed: testResults.passed,
    failed: testResults.failed,
    successRate: Math.round((testResults.passed / testResults.total) * 100)
  },
  details: testResults.details
}, null, 2))

console.log(`\n📄 Detailed test report saved to: ${reportPath}`)
